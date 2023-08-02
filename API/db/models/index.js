//use this file to combine all the modules to make it easier 

const {List} = require('./list.model');
const {Task} = require('./task.model');
const {User} = require('./user.model');

module.exports = {
    List,
    Task, 
    User
}