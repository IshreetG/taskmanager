const mongoose = require('mongoose');
const _ = require('lodash'); 
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs')

//jwt secret
const jwtsecret = "187534457020647788618075145993fniowjehu38p2932-=4658955909";
const UserSchema = new mongoose.Schema ({
    email:{
        type: String,
        required: true, 
        minlength: 1, 
        unique: true, 
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    sessions: [{
        token:{
            type: String, 
            required: true

        }, 
        expiresAt: {
            type: Number, 
            required: true
        }
    }]
});

//Instance methods

UserSchema.methods.toJSON = function(){
    const user = this;
    const userObject = user.toObject();

    //now we need to return the document expect the password and the sessions (since these shouldn't be made available)
    return _.omit(userObject, ['password', 'sessions']);
}

UserSchema.methods.generateAccessAuthToken = function(){
    const user = this;

    return new Promise((resolve, reject) =>{
        //create JSON web token and return that 
        jwt.sign({_id: user_id.toHexString()},jwtsecret, {expiresIn: "15m"},(err, token) =>{
            if(!err) {
                resolve(token);
            }
            else {
                //this means there is error
                reject();
            }
        } )
    })
}
UserSchema.methods.generateRefereshAuthToken = function(){
    //generates a 64byte hex string which doesn't have to save in the data base 
    return new Promise ((resolve, reject)=> {
        crypto.randomBytes(64, (err, buf)=>{
            if(!err){
                //if there is no error
                let token = buf.toString('hex');
                return resolve(token);
            }
        })

    })

}
UserSchema.methods.createSession = function() {
    let user = this;
    return user.generateRefereshAuthToken().then((refreshToken) =>{
        return saveSessionToDatabase(user, refreshToken);

    }).then((refreshToken) =>{
        //saved to database successfully
        //return the refresh token
        return refreshToken;

    }).catch((e) => {
        return Promise.reject('failed to save in database.\n' + e);
    })

}

UserSchema.statics.getJWTSecret = ()=>{
    return jwtsecret;
}
//Model methods. 
UserSchema.statics.findByIdAndToken = function(_id, token) {
    //find user by id and token
    //used in authentication middleware 

    const User = this;
    return User.findOne({
        _id, 
        'sessions.token': token
    });
}

UserSchema.statics.findByCredentials = function(email, password) {
    let User = this;
    user.findOne({email}).then((user) =>{
        if(!user) {
            return Promise.reject();
        }
        return new Promise((resolve, reject) =>{
            bcrypt.compare(password, user.password, (err, res) =>{
                if(res) resolve (user);
                else {
                    reject();
                }
            })
        })
    })
}

UserSchema.statics.hasRefreshTokenExpired = (expiresAt) =>{
    let secondsSinceEpoch = Date.now()/1000;
    if(expiresAt > secondsSinceEpoch) {
        return false;
        //has not expired
    }
    else {
        return true;
        //has expired
    }
}

//Middlewear; before doc is saved this piece of code will run 

UserSchema.pre('save', function(next){
    let user = this;
    let costFactor = 10; //number of hashing rounds how long it would take to hash passwords

    if(user.isModified('password')){
        //if the password field has been changed then we run this piece of code

        //hash the password

        bcrypt.genSalt(costFactor,(err, salt) =>{
            bcrypt.hash(user.password, salt, (err,hash)=>{
                user.password = hash;
                next();
            })
        })
        }
    else {
        next();
    }

});









//helper methods 
let saveSessionToDatabase = (user, refreshToken)=> {
    return new Promise((resolve, reject) =>{
        let expiresAt = generateRefreshTokenExpiryTime();
        user.sessions.push({'token': refreshToken, expiresAt});

        user.save().then(()=>{
            //saved the session successfully
            return resolve(refreshToken);
        }).catch((e) => {
            reject(e);
        });
    })
}

let generateRefreshTokenExpiryTime = () => {
    let daysUntilExpire = "10";
    let secondsUntilExpire = ((daysUntilExpire * 24) * 60) * 60;
    return ((Date.now() / 1000) + secondsUntilExpire);
}
const User = mongoose.model('User', UserSchema);

module.exports = { User };