const state = require('./stateManager');
state.set('myKey', { foo: 'bar' });
const value = state.get('myKey'); // returns { foo: 'bar' }

const catchfish = (username) => {

};