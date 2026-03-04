# Code Format Guidelines

This project favors readability over compactness.

## General Principles
- Prefer block statements for control flow, even for single-line bodies.
- Use braces for `if`, `else`, `for`, `while`, `do`, `try/catch/finally`, and arrow functions with statements.
- Separate logical blocks with blank lines to improve scanning.
- Keep line length reasonable; break long expressions instead of compressing.

## Examples

Preferred:
```js
if (!value) {
  return;
}

const user = await findUser(id);
if (!user) {
  return null;
}

const profile = await loadProfile(user.id);
return profile;
```

Avoid:
```js
if (!value) return;
const user = await findUser(id);
if (!user) return null;
const profile = await loadProfile(user.id);
return profile;
```

## Auto format
After each edit run the format for biome

```shell
pnpm format
```