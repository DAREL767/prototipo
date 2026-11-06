import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createState,makeOrder,processEvent} from './model.js';
test('cada grupo procesa el mismo evento sin duplicar su efecto',()=>{const state=createState('test'),event=makeOrder({customer:'Ana',total:45});processEvent(state,'notifications',event);processEvent(state,'notifications',event);processEvent(state,'analytics',event);assert.equal(state.groups.notifications.processed.length,1);assert.equal(state.groups.analytics.processed.length,1);});
test('rechaza pedidos inválidos',()=>{for(const input of [{customer:'',total:3},{customer:'Ana',total:-1},{customer:'Ana',total:'abc'}])assert.throws(()=>makeOrder(input));});
