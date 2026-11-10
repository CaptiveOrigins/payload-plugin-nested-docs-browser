// Writes dist/client/styles.css from the compiled stylesheet, for sites that import CSS instead of rendering it.
import { writeFileSync } from 'node:fs'
import { NDB_STYLES } from '../dist/client/styles.js'
writeFileSync(new URL('../dist/client/styles.css', import.meta.url), NDB_STYLES.trim() + '\n')
