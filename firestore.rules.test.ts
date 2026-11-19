import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const rulesContent = fs.readFileSync(rulesPath, 'utf8');

test('firestore.rules includes global default-deny and strict email_verified enforcement', () => {
  assert.match(rulesContent, /rules_version = '2';/);
  assert.match(rulesContent, /match \/\{document=\*\*\} \{\s*allow read, write: if false;\s*\}/);
  assert.match(rulesContent, /request\.auth\.token\.email_verified == true/);
  assert.match(rulesContent, /function isValidId\(id\)/);
  assert.match(rulesContent, /request\.time/);
});

test('firestore.rules enforces strict field allow-lists and ownership on users and reports collections', () => {
  assert.match(rulesContent, /match \/users\/\{userId\}/);
  assert.match(rulesContent, /data\.keys\(\)\.hasOnly\(\['uid', 'email', 'displayName', 'poste', 'classeAssignee', 'createdAt', 'updatedAt'\]\)/);
  assert.match(rulesContent, /affectedKeys\(\)\.hasOnly\(\['displayName', 'poste', 'classeAssignee', 'updatedAt'\]\)/);

  assert.match(rulesContent, /match \/reports\/\{reportId\}/);
  assert.match(rulesContent, /data\.keys\(\)\.hasOnly\(\['ownerId', 'reportKind', 'anneeScolaire', 'ecole', 'payload', 'createdAt', 'updatedAt'\]\)/);
  assert.match(rulesContent, /data\.reportKind in \['prim_debut', 'prim_fin'\]/);
  assert.match(rulesContent, /resource == null && isOwnReportId\(reportId\)/);
  assert.match(rulesContent, /existing\(\)\.ownerId == request\.auth\.uid \|\| isAdmin\(\)/);
  assert.match(rulesContent, /email\.lower\(\) == 'kankanjakankanja@gmail\.com'/);
});
