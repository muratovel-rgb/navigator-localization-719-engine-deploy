#!/usr/bin/env node
'use strict';
const fs = require('fs');
const A = require('./adapter.js');

const action = process.argv[2];
const raw = process.argv[3] || fs.readFileSync(0, 'utf8') || '{}';
let input = {};
try { input = JSON.parse(raw); } catch (e) { console.error(JSON.stringify({ok:false,error:'Invalid JSON',detail:e.message})); process.exit(2); }
const map = {
  health: A.health,
  search_rules: A.searchRules,
  get_rule: A.getRule,
  calculate_localization: A.calculateLocalization,
  threshold_context: A.thresholdContext,
};
if (!map[action]) { console.error(JSON.stringify({ok:false,error:`Unknown action: ${action}`})); process.exit(2); }
try { console.log(JSON.stringify({ok:true,data:map[action](input)}, null, 2)); }
catch (e) { console.error(JSON.stringify({ok:false,error:e.message})); process.exit(1); }

