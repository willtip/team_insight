// One-off: dump the shipped mock/seed data to JSON fixtures for the Python seed script.
import { writeFileSync, mkdirSync } from 'fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LIB = path.join(ROOT, '.tmp-lib')

const mockData = require(path.join(LIB, 'mock-data.js'))
const skillCatalog = require(path.join(LIB, 'skill-catalog.js'))
const seedAssessments = require(path.join(LIB, 'seed-assessments.js'))

const outDir = path.join(ROOT, 'backend', 'seed_data')
mkdirSync(outDir, { recursive: true })

writeFileSync(`${outDir}/employees.json`, JSON.stringify(mockData.EMPLOYEES, null, 2))
writeFileSync(`${outDir}/skill_catalog.json`, JSON.stringify(skillCatalog.AAP_SKILL_CATALOG, null, 2))
writeFileSync(`${outDir}/role_profiles.json`, JSON.stringify(skillCatalog.ROLE_PROFILES, null, 2))
writeFileSync(`${outDir}/thresholds.json`, JSON.stringify(skillCatalog.DEFAULT_THRESHOLDS, null, 2))
writeFileSync(`${outDir}/seed_assessments.json`, JSON.stringify(seedAssessments.SEED_ASSESSMENTS ?? {}, null, 2))
writeFileSync(`${outDir}/seed_role_assignments.json`, JSON.stringify(seedAssessments.SEED_ROLE_PROFILES ?? {}, null, 2))

console.log('Wrote seed fixtures to', outDir)
