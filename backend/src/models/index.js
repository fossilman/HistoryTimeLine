import Civilization from './Civilization.js';
import Polity from './Polity.js';
import Person from './Person.js';
import Event from './Event.js';

// 定义关联关系
Polity.belongsTo(Civilization, {
  foreignKey: 'civilizationId',
  as: 'civilization'
});

Civilization.hasMany(Polity, {
  foreignKey: 'civilizationId',
  as: 'polities'
});

Person.belongsTo(Polity, {
  foreignKey: 'polityId',
  as: 'polity'
});

Person.belongsTo(Civilization, {
  foreignKey: 'civilizationId',
  as: 'civilization'
});

Polity.hasMany(Person, {
  foreignKey: 'polityId',
  as: 'persons'
});

Civilization.hasMany(Person, {
  foreignKey: 'civilizationId',
  as: 'persons'
});

export {
  Civilization,
  Polity,
  Person,
  Event
};

