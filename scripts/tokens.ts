import {writeFileSync} from 'node:fs';
import {cssVariables} from '../lib/tokens';
writeFileSync('app/tokens.css',cssVariables());
console.log('wrote app/tokens.css');
