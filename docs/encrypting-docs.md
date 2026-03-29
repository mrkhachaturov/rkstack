# Encrypting specs and plans

RKstack saves design specs and implementation plans to `docs/rkstack/`. These files are tracked in git so you can access them across machines and branches.

If your repo is public and you don't want your plans visible on GitHub, you can opt into transparent encryption using [age](https://github.com/FiloSottile/age). Files stay plaintext on your machine — encryption only happens inside git.

## How it works

```text
Your editor / AI tools    →  plaintext (always readable)
git add / git commit      →  age encrypts automatically
GitHub / GitLab / remote  →  encrypted blobs
git checkout / git pull   →  age decrypts automatically
```

Git's clean/smudge filter system handles encryption and decryption. You never run `age` manually — git does it for you on every commit and checkout.

## Prerequisites

Install age:

```bash
# macOS
brew install age

# Debian / Ubuntu
sudo apt install age

# Arch
pacman -S age

# Nix
nix-env -i age
```

## Setup (first machine)

Run the setup script from your project root:

```bash
bash scripts/setup-age-encryption.sh
```

If you have [just](https://github.com/casey/just) installed:

```bash
just setup-age
```

This does four things:

1. **Generates an age keypair** at `~/.age/key.txt` (private key — never share, never commit)
2. **Creates `age-recipients.txt`** in the repo with your public key (safe to commit)
3. **Adds `.gitattributes`** entry so git knows which files to encrypt
4. **Configures git filters** in your local `.git/config` (clean = encrypt, smudge = decrypt)

After setup, commit the new files:

```bash
git add age-recipients.txt .gitattributes
git commit -m "chore: enable age encryption for docs/rkstack/"
```

Then re-stage your docs so they get encrypted:

```bash
git rm --cached -r docs/rkstack/
git add docs/rkstack/
git commit -m "chore: re-encrypt existing docs"
```

## Setup (additional machines)

When you clone the repo on another machine (or a collaborator clones it):

```bash
git clone <repo-url>
bash scripts/setup-age-encryption.sh
```

If this is a **new machine** (not the one that created the recipients file), the script generates a new keypair and adds the public key to `age-recipients.txt`. Commit and push that change:

```bash
git add age-recipients.txt
git commit -m "chore: add machine B to age recipients"
git push
```

Then re-encrypt existing docs so both keys can decrypt:

```bash
git rm --cached -r docs/rkstack/
git add docs/rkstack/
git commit -m "chore: re-encrypt docs for new recipient"
git push
```

On the first machine, pull to get the updated recipients and re-encrypted files.

## Adding a collaborator

1. They install age and run `age-keygen -o ~/.age/key.txt`
2. They send you their public key (starts with `age1...`)
3. You add it to `age-recipients.txt` (one key per line)
4. Re-encrypt and commit:

```bash
git rm --cached -r docs/rkstack/
git add docs/rkstack/ age-recipients.txt
git commit -m "chore: add collaborator to age recipients"
```

## Verifying encryption

To confirm files are encrypted in git (not just on disk):

```bash
# Show what git stores (should be age-encrypted)
git show :docs/rkstack/specs/some-file.md | head -3
# Expected: -----BEGIN AGE ENCRYPTED FILE-----
```

To confirm diffs still work (should show readable plaintext):

```bash
git diff docs/rkstack/
git log -p -- docs/rkstack/
```

The included `scripts/check-age-encryption.sh` verifies that all staged docs are encrypted. It runs automatically as a pre-commit hook (via husky) if `age-recipients.txt` exists.

You can also run it manually:

```bash
bash scripts/check-age-encryption.sh
```

## Pre-commit safety net (husky)

RKstack uses [husky](https://typicode.github.io/husky/) to run a pre-commit hook that prevents accidentally committing plaintext docs when encryption is enabled.

The hook lives at `.husky/pre-commit` and runs `scripts/check-age-encryption.sh`. If `age-recipients.txt` exists but a staged doc file isn't encrypted (meaning the git filters aren't set up on this machine), the commit is blocked with a clear error telling you to run the setup script.

**How husky gets installed:**

```bash
bun install
```

That's it. The `"prepare": "husky"` script in `package.json` runs automatically and registers `.husky/` as the hooks directory. No manual hook installation needed.

If you don't use Bun, you can install hooks manually:

```bash
npx husky          # npm
pnpm exec husky    # pnpm
```

**What's in `.husky/`:**

```text
.husky/
├── pre-commit     ← the hook script (committed, runs on every commit)
└── _/             ← legacy husky internals (gitignored, ignore it)
```

The `_/` folder is a backwards-compatibility shim from older husky versions. It's gitignored inside `.husky/_/.gitignore` and can be safely ignored.

## Opting out

If you don't create `age-recipients.txt`, nothing happens. Docs are committed as plaintext. The pre-commit hook skips the check. All skills work identically either way.

To remove encryption from an existing project:

```bash
# Remove filters
git config --unset filter.age.clean
git config --unset filter.age.smudge
git config --unset filter.age.required
git config --unset diff.age.textconv

# Remove config files
git rm age-recipients.txt .gitattributes
git commit -m "chore: remove age encryption"

# Re-commit docs as plaintext
git rm --cached -r docs/rkstack/
git add docs/rkstack/
git commit -m "chore: commit docs as plaintext"
```

## File layout

```text
age-recipients.txt          ← public keys (committed, safe to share)
.gitattributes              ← tells git which files use the age filter
~/.age/key.txt              ← private key (local only, NEVER committed)
scripts/setup-age-encryption.sh  ← setup script
scripts/check-age-encryption.sh  ← pre-commit verification
scripts/age-textconv.sh          ← smart diff helper
```

## Troubleshooting

**"age: error: failed to read header"** on `git diff`
— The textconv wrapper (`scripts/age-textconv.sh`) handles this. Re-run `just setup-age` to reconfigure.

**Pre-commit hook blocks your commit**
— You have `age-recipients.txt` but filters aren't configured. Run `bash scripts/setup-age-encryption.sh`.

**Collaborator can't decrypt**
— Their public key must be in `age-recipients.txt`, and docs must be re-encrypted after adding it (`git rm --cached -r docs/rkstack/ && git add docs/rkstack/`).

**Lost your private key**
— Generate a new one (`age-keygen -o ~/.age/key.txt`), add the new public key to recipients, and have someone with a working key re-encrypt and push.
