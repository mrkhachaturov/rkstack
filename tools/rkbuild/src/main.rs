use anyhow::{anyhow, bail, Context, Result};
use clap::{Parser, Subcommand};
use fs_err as fs;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
use std::path::{Path, PathBuf};
use std::process::Command;
use tempfile::Builder;
use time::format_description::FormatItem;
use time::macros::format_description;
use time::OffsetDateTime;
use time::UtcOffset;
use walkdir::WalkDir;

static DATE_FORMAT: &[FormatItem<'static>] = format_description!("[year]-[month]-[day]");

#[derive(Parser, Debug)]
#[command(name = "rkbuild", about = "Build rkstack plugins from manifests and overlays")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand, Debug)]
enum Commands {
    Build {
        pack: Option<String>,
    },
    Validate {
        pack: Option<String>,
    },
    CheckDrift {
        pack: Option<String>,
    },
    Diff {
        pack: Option<String>,
    },
}

#[derive(Debug, Clone)]
struct RepoPaths {
    root: PathBuf,
    packs: PathBuf,
    plugins: PathBuf,
    upstreams: PathBuf,
}

impl RepoPaths {
    fn discover() -> Result<Self> {
        let root = std::env::current_dir().context("failed to determine current directory")?;
        let repo = Self {
            packs: root.join("packs"),
            plugins: root.join("plugins"),
            upstreams: root.join(".upstreams"),
            root,
        };

        if !repo.packs.is_dir() {
            bail!("packs/ not found under {}", repo.root.display());
        }
        if !repo.upstreams.is_dir() {
            bail!(".upstreams/ not found under {}", repo.root.display());
        }

        Ok(repo)
    }
}

#[derive(Debug, Deserialize)]
struct Manifest {
    pack: PackMetadata,
    imports: Vec<ImportSpec>,
    #[serde(default)]
    dependencies: BTreeMap<String, DependencySpec>,
    transforms: Option<Transforms>,
}

#[derive(Debug, Deserialize)]
struct PackMetadata {
    name: String,
    version: String,
    description: String,
}

#[derive(Debug, Deserialize)]
struct ImportSpec {
    upstream: String,
    #[serde(rename = "type")]
    kind: ImportType,
    include: Vec<String>,
}

#[derive(Debug, Deserialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
enum ImportType {
    Skills,
    Agents,
    Commands,
}

#[derive(Debug, Default, Deserialize)]
struct DependencySpec {
    #[serde(default)]
    skills: Vec<String>,
    #[serde(default)]
    resources: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct Transforms {
    #[serde(default)]
    replace: BTreeMap<String, String>,
}

#[derive(Debug, Deserialize, Serialize, Default)]
struct PackLock {
    #[serde(default)]
    upstream_refs: BTreeMap<String, UpstreamRef>,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    overrides: BTreeMap<String, OverrideEntry>,
}

#[derive(Debug, Deserialize, Serialize)]
struct UpstreamRef {
    sha: String,
    tag: String,
}

#[derive(Debug, Deserialize, Serialize)]
struct OverrideEntry {
    override_date: String,
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    let repo = RepoPaths::discover()?;

    match cli.command {
        Commands::Build { pack } => {
            for pack_name in resolve_packs(&repo, pack.as_deref())? {
                build_pack(&repo, &pack_name)?;
            }
        }
        Commands::Validate { pack } => {
            for pack_name in resolve_packs(&repo, pack.as_deref())? {
                validate_pack(&repo, &pack_name)?;
            }
        }
        Commands::CheckDrift { pack } => {
            check_drift(&repo, pack.as_deref())?;
        }
        Commands::Diff { pack } => {
            diff_packs(&repo, pack.as_deref())?;
        }
    }

    Ok(())
}

fn resolve_packs(repo: &RepoPaths, selected: Option<&str>) -> Result<Vec<String>> {
    if let Some(pack) = selected {
        let manifest = repo.packs.join(pack).join("pack.yaml");
        if !manifest.is_file() {
            bail!("manifest not found: {}", manifest.display());
        }
        return Ok(vec![pack.to_string()]);
    }

    let mut packs = Vec::new();
    for entry in fs::read_dir(&repo.packs).context("failed to list packs/")? {
        let entry = entry?;
        let path = entry.path();
        if path.is_dir() && path.join("pack.yaml").is_file() {
            packs.push(entry.file_name().to_string_lossy().into_owned());
        }
    }
    packs.sort();

    if packs.is_empty() {
        bail!("no pack.yaml files found under {}", repo.packs.display());
    }

    Ok(packs)
}

fn build_pack(repo: &RepoPaths, pack: &str) -> Result<()> {
    println!("-> Building {pack}...");
    fs::create_dir_all(&repo.plugins).with_context(|| format!("failed to create {}", repo.plugins.display()))?;

    let manifest = load_manifest(repo, pack)?;
    let staging_root = Builder::new()
        .prefix(".rkbuild-")
        .tempdir_in(&repo.plugins)
        .with_context(|| format!("failed to create temp dir in {}", repo.plugins.display()))?;
    let staging_pack_dir = staging_root.path().join(pack);

    assemble_pack(repo, pack, &manifest, &staging_pack_dir, true)?;

    let final_output = repo.plugins.join(pack);
    if final_output.exists() {
        fs::remove_dir_all(&final_output)
            .with_context(|| format!("failed to remove {}", final_output.display()))?;
    }
    fs::rename(&staging_pack_dir, &final_output)
        .with_context(|| format!("failed to move build output into {}", final_output.display()))?;

    println!("✓ Built {pack} -> {}", final_output.display());
    Ok(())
}

fn validate_pack(repo: &RepoPaths, pack: &str) -> Result<()> {
    println!("-> Validating {pack}...");
    let manifest = load_manifest(repo, pack)?;
    let staging_root = tempfile::tempdir().context("failed to create validation temp dir")?;
    let output = staging_root.path().join(pack);
    assemble_pack(repo, pack, &manifest, &output, false)?;
    println!("✓ Validated {pack}");
    Ok(())
}

fn diff_packs(repo: &RepoPaths, selected: Option<&str>) -> Result<()> {
    let packs = resolve_packs(repo, selected)?;
    let mut any_changes = false;

    for pack in packs {
        let manifest = load_manifest(repo, &pack)?;
        let staging_root = tempfile::tempdir().context("failed to create diff temp dir")?;
        let fresh = staging_root.path().join(&pack);
        assemble_pack(repo, &pack, &manifest, &fresh, false)?;

        let current = repo.plugins.join(&pack);
        let changes = collect_diff_entries(&current, &fresh)?;

        if changes.is_empty() {
            println!("✓ {pack}: no differences");
            continue;
        }

        any_changes = true;
        println!("! {pack}: differences found");
        for change in changes {
            println!("  {change}");
        }
    }

    if !any_changes {
        println!("✓ No differences found");
    }

    Ok(())
}

fn check_drift(repo: &RepoPaths, selected: Option<&str>) -> Result<()> {
    let packs = resolve_packs(repo, selected)?;
    let mut found_drift = false;

    for pack in packs {
        let lock_path = repo.packs.join(&pack).join("pack.lock");
        if !lock_path.is_file() {
            println!("! {pack}: no lockfile found");
            continue;
        }

        let lock = read_lockfile(&lock_path)?;
        let mut pack_has_drift = false;

        for (upstream, locked) in &lock.upstream_refs {
            let upstream_path = repo.upstreams.join(upstream);
            let current_sha = git_rev_parse_head(&upstream_path).unwrap_or_else(|| "unknown".to_string());
            if current_sha != locked.sha {
                let current_tag = git_describe_exact_tag(&upstream_path).unwrap_or_else(|| "untagged".to_string());
                println!(
                    "! {pack}: upstream '{upstream}' changed: {} ({}) -> {} ({})",
                    shorten_sha(&locked.sha),
                    locked.tag,
                    shorten_sha(&current_sha),
                    current_tag
                );
                found_drift = true;
                pack_has_drift = true;
            }
        }

        if !pack_has_drift {
            println!("✓ {pack}: no drift detected");
        }
    }

    if !found_drift {
        println!("✓ No drift detected");
    }

    Ok(())
}

fn assemble_pack(
    repo: &RepoPaths,
    pack: &str,
    manifest: &Manifest,
    output: &Path,
    update_lockfile: bool,
) -> Result<()> {
    if output.exists() {
        fs::remove_dir_all(output).with_context(|| format!("failed to remove {}", output.display()))?;
    }
    fs::create_dir_all(output).with_context(|| format!("failed to create {}", output.display()))?;

    process_imports(repo, manifest, output)?;
    apply_transforms(manifest, output)?;
    apply_overlay(repo, pack, output)?;
    ensure_hook_scripts_executable(output)?;
    validate_dependencies(manifest, output, pack)?;

    if update_lockfile {
        write_lockfile(repo, pack, manifest)?;
    }

    Ok(())
}

fn load_manifest(repo: &RepoPaths, pack: &str) -> Result<Manifest> {
    let path = repo.packs.join(pack).join("pack.yaml");
    let raw = fs::read_to_string(&path).with_context(|| format!("failed to read {}", path.display()))?;
    let manifest: Manifest =
        serde_yaml::from_str(&raw).with_context(|| format!("failed to parse {}", path.display()))?;

    if manifest.pack.name != pack {
        bail!(
            "pack metadata mismatch: manifest says '{}' but directory is '{}'",
            manifest.pack.name,
            pack
        );
    }
    if manifest.pack.version.trim().is_empty() {
        bail!("pack {} has an empty version", manifest.pack.name);
    }
    if manifest.pack.description.trim().is_empty() {
        bail!("pack {} has an empty description", manifest.pack.name);
    }

    Ok(manifest)
}

/// Parse "name" or "name as alias" from an include entry.
/// Returns (source_name, destination_name).
fn parse_include_entry(entry: &str) -> (&str, &str) {
    if let Some((src, dst)) = entry.split_once(" as ") {
        (src.trim(), dst.trim())
    } else {
        (entry.as_ref(), entry.as_ref())
    }
}

fn process_imports(repo: &RepoPaths, manifest: &Manifest, output: &Path) -> Result<()> {
    for import in &manifest.imports {
        let upstream_root = repo.upstreams.join(&import.upstream);
        if !upstream_root.is_dir() {
            bail!("upstream '{}' not found at {}", import.upstream, upstream_root.display());
        }

        for entry in &import.include {
            let (src_name, dst_name) = parse_include_entry(entry);

            match import.kind {
                ImportType::Skills => {
                    let src = upstream_root.join("skills").join(src_name);
                    let dst = output.join("skills").join(dst_name);
                    if !src.is_dir() {
                        bail!("skill directory not found: {}", src.display());
                    }
                    copy_tree_contents(&src, &dst)?;
                }
                ImportType::Agents => {
                    let src = upstream_root.join("agents").join(format!("{src_name}.md"));
                    let dst = output.join("agents").join(format!("{dst_name}.md"));
                    copy_file_with_parents(&src, &dst)?;
                }
                ImportType::Commands => {
                    let src = upstream_root.join("commands").join(format!("{src_name}.md"));
                    let dst = output.join("commands").join(format!("{dst_name}.md"));
                    copy_file_with_parents(&src, &dst)?;
                }
            }
        }
    }

    Ok(())
}

fn apply_transforms(manifest: &Manifest, output: &Path) -> Result<()> {
    let Some(transforms) = &manifest.transforms else {
        return Ok(());
    };
    if transforms.replace.is_empty() {
        return Ok(());
    }

    for entry in WalkDir::new(output) {
        let entry = entry?;
        if !entry.file_type().is_file() {
            continue;
        }

        let path = entry.path();
        if !is_text_transform_target(path) {
            continue;
        }

        let original = fs::read_to_string(path)
            .with_context(|| format!("failed to read transform target {}", path.display()))?;
        let mut updated = original.clone();
        for (from, to) in &transforms.replace {
            updated = updated.replace(from, to);
        }

        if updated != original {
            fs::write(path, updated)
                .with_context(|| format!("failed to write transformed file {}", path.display()))?;
        }
    }

    Ok(())
}

fn apply_overlay(repo: &RepoPaths, pack: &str, output: &Path) -> Result<()> {
    let overlay = repo.packs.join(pack).join("overlay");
    if overlay.is_dir() {
        copy_tree_contents(&overlay, output)?;
    }
    Ok(())
}

fn validate_dependencies(manifest: &Manifest, output: &Path, pack: &str) -> Result<()> {
    let mut errors = Vec::new();

    for (skill, deps) in &manifest.dependencies {
        let skill_dir = output.join("skills").join(skill);
        if !skill_dir.is_dir() {
            errors.push(format!(
                "{pack}: dependency stanza targets missing skill directory {}",
                normalize_path(&skill_dir)
            ));
            continue;
        }

        for dep in &deps.skills {
            let dep_dir = output.join("skills").join(dep);
            if !dep_dir.is_dir() {
                errors.push(format!(
                    "{pack}: skill \"{skill}\" requires skill \"{dep}\" but it was not found in output"
                ));
            }
        }

        for resource in &deps.resources {
            let path = output.join(resource);
            if !path.is_file() {
                errors.push(format!(
                    "{pack}: skill \"{skill}\" requires resource \"{resource}\" but it was not found in output"
                ));
            }
        }
    }

    if errors.is_empty() {
        return Ok(());
    }

    for error in &errors {
        eprintln!("✗ {error}");
    }
    bail!("{pack}: {} dependency error(s) found", errors.len());
}

fn write_lockfile(repo: &RepoPaths, pack: &str, manifest: &Manifest) -> Result<()> {
    let mut upstream_refs = BTreeMap::new();
    let unique_upstreams: BTreeSet<_> = manifest.imports.iter().map(|import| import.upstream.as_str()).collect();

    for upstream in unique_upstreams {
        let upstream_path = repo.upstreams.join(upstream);
        let sha = git_rev_parse_head(&upstream_path).unwrap_or_else(|| "unknown".to_string());
        let tag = git_describe_exact_tag(&upstream_path).unwrap_or_else(|| "untagged".to_string());
        upstream_refs.insert(upstream.to_string(), UpstreamRef { sha, tag });
    }

    let overlay = repo.packs.join(pack).join("overlay");
    let mut overrides = BTreeMap::new();
    if overlay.is_dir() {
        for entry in WalkDir::new(&overlay) {
            let entry = entry?;
            if !entry.file_type().is_file() {
                continue;
            }

            let path = entry.path();
            if path.file_name().and_then(|name| name.to_str()) == Some(".DS_Store") {
                continue;
            }

            let rel = relative_path(&overlay, path)?;
            let date = modified_date(path)?;
            overrides.insert(rel, OverrideEntry { override_date: date });
        }
    }

    let lock = PackLock {
        upstream_refs,
        overrides,
    };

    let serialized = serde_yaml::to_string(&lock).context("failed to serialize pack.lock")?;
    let lock_path = repo.packs.join(pack).join("pack.lock");
    fs::write(&lock_path, serialized).with_context(|| format!("failed to write {}", lock_path.display()))?;
    Ok(())
}

fn read_lockfile(path: &Path) -> Result<PackLock> {
    let raw = fs::read_to_string(path).with_context(|| format!("failed to read {}", path.display()))?;
    let lock: PackLock = serde_yaml::from_str(&raw).with_context(|| format!("failed to parse {}", path.display()))?;
    Ok(lock)
}

fn copy_tree_contents(src: &Path, dst: &Path) -> Result<()> {
    if !src.is_dir() {
        bail!("directory not found: {}", src.display());
    }

    for entry in WalkDir::new(src) {
        let entry = entry?;
        let path = entry.path();
        let relative = path
            .strip_prefix(src)
            .with_context(|| format!("failed to strip prefix {} from {}", src.display(), path.display()))?;
        let target = dst.join(relative);

        if entry.file_type().is_dir() {
            fs::create_dir_all(&target).with_context(|| format!("failed to create {}", target.display()))?;
            continue;
        }

        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent).with_context(|| format!("failed to create {}", parent.display()))?;
        }
        fs::copy(path, &target)
            .with_context(|| format!("failed to copy {} to {}", path.display(), target.display()))?;
    }

    Ok(())
}

fn copy_file_with_parents(src: &Path, dst: &Path) -> Result<()> {
    if !src.is_file() {
        bail!("file not found: {}", src.display());
    }
    if let Some(parent) = dst.parent() {
        fs::create_dir_all(parent).with_context(|| format!("failed to create {}", parent.display()))?;
    }
    fs::copy(src, dst).with_context(|| format!("failed to copy {} to {}", src.display(), dst.display()))?;
    Ok(())
}

fn ensure_hook_scripts_executable(output: &Path) -> Result<()> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;

        let hooks_dir = output.join("hooks");
        if !hooks_dir.is_dir() {
            return Ok(());
        }

        for entry in WalkDir::new(&hooks_dir) {
            let entry = entry?;
            if !entry.file_type().is_file() {
                continue;
            }
            let path = entry.path();
            if path.extension().and_then(|ext| ext.to_str()) == Some("json") {
                continue;
            }

            let metadata = fs::metadata(path)
                .with_context(|| format!("failed to read metadata for {}", path.display()))?;
            let mut perms = metadata.permissions();
            let mode = perms.mode();
            perms.set_mode(mode | 0o755);
            fs::set_permissions(path, perms)
                .with_context(|| format!("failed to update permissions for {}", path.display()))?;
        }
    }

    Ok(())
}

fn collect_diff_entries(current: &Path, fresh: &Path) -> Result<Vec<String>> {
    let current_files = collect_files(current)?;
    let fresh_files = collect_files(fresh)?;
    let all_paths: BTreeSet<_> = current_files.keys().chain(fresh_files.keys()).cloned().collect();
    let mut changes = Vec::new();

    for rel in all_paths {
        match (current_files.get(&rel), fresh_files.get(&rel)) {
            (None, Some(_)) => changes.push(format!("A {rel}")),
            (Some(_), None) => changes.push(format!("D {rel}")),
            (Some(left), Some(right)) => {
                let left_bytes = fs::read(left)
                    .with_context(|| format!("failed to read {}", left.display()))?;
                let right_bytes = fs::read(right)
                    .with_context(|| format!("failed to read {}", right.display()))?;
                if left_bytes != right_bytes {
                    changes.push(format!("M {rel}"));
                }
            }
            (None, None) => {}
        }
    }

    Ok(changes)
}

fn collect_files(root: &Path) -> Result<BTreeMap<String, PathBuf>> {
    let mut files = BTreeMap::new();
    if !root.exists() {
        return Ok(files);
    }

    for entry in WalkDir::new(root) {
        let entry = entry?;
        if !entry.file_type().is_file() {
            continue;
        }
        let rel = relative_path(root, entry.path())?;
        files.insert(rel, entry.path().to_path_buf());
    }

    Ok(files)
}

fn relative_path(base: &Path, path: &Path) -> Result<String> {
    let rel = path
        .strip_prefix(base)
        .with_context(|| format!("failed to strip prefix {} from {}", base.display(), path.display()))?;
    Ok(normalize_path(rel))
}

fn normalize_path(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

fn is_text_transform_target(path: &Path) -> bool {
    matches!(
        path.extension().and_then(|ext| ext.to_str()),
        Some("md" | "json" | "yaml" | "yml" | "sh" | "js" | "ts" | "dot" | "html")
    )
}

fn modified_date(path: &Path) -> Result<String> {
    let system_time = fs::metadata(path)
        .with_context(|| format!("failed to read metadata for {}", path.display()))?
        .modified()
        .with_context(|| format!("failed to read modified time for {}", path.display()))?;
    let mut timestamp = OffsetDateTime::from(system_time);
    if let Ok(offset) = UtcOffset::current_local_offset() {
        timestamp = timestamp.to_offset(offset);
    }
    timestamp
        .format(DATE_FORMAT)
        .map_err(|error| anyhow!("failed to format modified date for {}: {error}", path.display()))
}

fn git_rev_parse_head(repo: &Path) -> Option<String> {
    run_git(repo, &["rev-parse", "HEAD"])
}

fn git_describe_exact_tag(repo: &Path) -> Option<String> {
    run_git(repo, &["describe", "--tags", "--exact-match", "HEAD"])
}

fn run_git(repo: &Path, args: &[&str]) -> Option<String> {
    let output = Command::new("git")
        .arg("-C")
        .arg(repo)
        .args(args)
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let value = String::from_utf8(output.stdout).ok()?;
    let trimmed = value.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

fn shorten_sha(sha: &str) -> &str {
    sha.get(..7).unwrap_or(sha)
}
