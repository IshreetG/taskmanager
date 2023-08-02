const express = require('express');
const app = express();
const {mongoose} = require('./db/mongoose.js');
const bodyParser = require('body-parser');

//load in the modules 

const {List, Task, User} = require('./db/models');
const { jwt } = require('jsonwebtoken');


//load middleware
app.use(bodyParser.json()); //pass the request body 

//headers middleware
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Controls", "GET, POST, HEAD, OPTIONS, PUT, PATCH, DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-access-token, x-refresh-token, _id");
    
    res.header(
        'Access-Control-Expose-Headers',
        'x-access-token, x-refresh-token'
    );
    next();
  });
 //refresh token middlewear which will verify the session 
//check wheather request has valid token
 let authenticate = (req,res,next) =>{
    let token = req.header('x-access-token');

    //verify JWT
     jwt.verify(token,user.getJWTSecret(), (err, decoded)=>{
        if(err){
            //there was an error JWT is invalid 
            res.status(401).send(err);
        }
        else {
            //jwt is valid
            req.user_id = decoded._id; 
            next();
        }


     });
 }
 
 let verifySession = ((req,res, next)=>{
    //grab request token
    let refreshToken = req.header('x-refresh-token');
    //grab id 
    let _id = req.header('_id');

    User.findByIdAndToken(_id, refreshToken).then((user) =>{
        if(!user){
            //user cannot be found
            return Promise.reject({
                'error': 'User is not found. Make sure refresh token and id are vaild'
            });
        }
        //if the user reaches here the user was found so therefore the session is valid 

        req.user_id = user._id;
        req.user.Oject = user;
        req.refreshToken = refreshToken;

        let isSessionValid = false;

        user.sessions.forEach((session) =>{
            if(session.token === refreshToken){
                //check if the session has expired 

                if(User.hasRefreshTokenExpired(session.expiresAt) == false) {
                    //refresh token has not expired 
                    isSessionValid = true;

                }
            }
        });
        if(isSessionValid){
            //session is valid then call next to continue to process web request 
            next();
        }
        else {
            //the session is not valid 
            return Promise.reject({
                'error':'Refresh Token Has Expired or session is invalid'
            })
        }
    }).catch((e)=>{
        res.status(401).send(e);
    })
 });

//this route will get all lists 

app.get('/lists', authenticate, (req, res) => {
    //we need to return array of lists in data base that belong to the authenticated user 
    List.find({
        _userID: req.user_id
    }).then((lists) => {
        res.send(lists);

    }).catch((e) =>{
        res.send(e);
    });
})
//post lists creates the list
app.post('/lists', authenticate,  (req, res) => {
    //create a new list and return new list document to user which is the id
    //the list information will be passed through json request body
    let title = req.body.title;
    let newList = new List({
        title, 
        _userId: req.user_id
    });
    newList.save().then((listDoc) =>{
        //the full list doc will be returned 

        res.send (listDoc);
    })

})

//purpose is to update spesficied list
app.patch('/lists/:id', authenticate, (req, res) => {
//here we want to update the list with the new values in json body
    List.findOneAndUpdate({_id: req.params.id, _userId: req.user_id }, {
        $set: req.body 

    }).then(() => {
        res.send({'message': 'updated successfully'}); //to let know update went through
    });

});

//delete list
app.delete('/lists/:id',authenticate, (req, res) => {
    //here we want to delete the spesified list
    List.findOneAndRemove({
        _id:req.params.id,
        _userId: req.user_id
    }).then((removedListDoc) =>{
        res.send(removedListDoc);

        //delete all the tasks that are in the deleted list 
        deleteTasksFromList(removedListDoc._id);

    })
    });

//get all tasks in a spesfic list
app.get('/lists/:listId/tasks',authenticate, (req,res) => {
    //we need to return all tasks that belong to list
    Task.find({
        _listID:req.params.listId
    }).then((tasks) => {
        res.send(tasks);
    })
});

app.get('/lists/:listId/tasks/taskId', (req,res) => {
    Task.findOne({
        _id:req.params.taskID,
        listId: req.params.listId
    }).then ((task) =>{
        res.send(task);

    })
});


app.post('/lists/:listId/tasks', authenticate, (req,res) => {
    //we want to create a new task in a list

    List.findOne({
        _id: req.params.listId, 
        _userId: req.user_id
    }).then((list)=>{
        if(list){
            //list object is valid so user can create new task
            return true;
        }
        return false;//the user object is undefined 

    }).then((canCreateTask) =>{
        if(canCreateTask){
            let newTask = new Task({
                title: req.body.title,
                _listID: req.params.listId
            });
            newTask.save().then((newTaskDoc) =>{
                res.send(newTaskDoc);
            }) 

        }
        else {
            res.sendStatus(404);
        }
    })
})
app.patch('/lists/:listId/tasks/taskId', authenticate,  (req,res) => {
    //we need to update the exisiting task
    List.findOne({
        _id: req.params.listId, 
        _userId: req.user_id
    }).then((list)=>{
        if(list){
            //list object is valid so user can create new task within list
            return true;
        }
        return false;
    }).then((canUpdateTasks)=>{
        if(canUpdateTasks){
            //the current authenicated user can update tasks 
            Task.findOneAndUpdate({_id: req.params.taskID, _listId: req.params.listId }, 
                {
                $set: req.body 
                }
        
            ).then(() =>{
                res.send({message: "Updating successfully"});
        
            })
        }
        else{
            res.sendStatus(404);
        }
    })
});

//to delete lists
app.delete('/lists/:listId/tasks/taskId', authenticate, (req,res) => {

    List.findOne({
        _id: req.params.listId, 
        _userId: req.user_id
    }).then((list)=>{
        if(list){
            //list object is valid so user can create new task within list
            return true;
        }
        return false;
    }).then((canDeleteTasks)=>{
        if(canDeleteTasks){
            Task.findOneAndRemove({
                _id:req.params.taskId, 
                _list_Id:req.params.listId
            }).then((removedTaskDoc) =>{
                res.send(removedTaskDoc);
            })

        }
        else{
            res.sendStatus(404);
        }
    });
});

//User routes 

//sign up route
app.post('/users',(req,res) => {
    //user will sign up 
    let body = req.body;
    let newUser = new User;

    newUser.save().then (()=>{
        return newUser.createSession();
    }).then((refreshToken)=>{
        //session is created successfully 
        //now we have to create an access authentication

        return newUser.generateAccessAuthToken().then((accessToken) =>{
            return {accessToken, refreshToken}
        });

    }).then((authTokens) =>{
        res 
            .header('x-refresh-token', authTokens.refreshToken)
            .header('x-access-token', authTokens.accessToken)
            .send(newUser);
    }).catch((e) =>{
        res.status(400).send(e);
    })
})

//for login 

app.post('/users/login', (req,res) => {
    let email = req.body.email; 
    let password = req.body.password;

    User.findByCredentials(email,password).then((user) =>{
        return user.createSession().then((refreshToken)=> {
            //now the session has been created so now we have to generate an access authenitcation token for the user 
            return user.generateAccessAuthToken().then((accessTokenoken)=>{
                return {accessToken, refreshToken}
            });
        }).then((authTokens) =>{
            res 
                .header('x-refresh-token', authTokens.refreshToken)
                .header('x-access-token', authTokens.accessToken)
                .send(user);

        })
    }).catch((e) =>{
        res.status(400).send(e);
    });

})
//generates and returns access token 

app.get('/users/me/access-token', verifySession, (req,res) => {
    //we know that at this point the user is authenticated and we have the userid and userobject avaible to us 
    req.userObject.generateAccessAuthToken().then((accessToken)=>{
        res.header('x-access-token',accessToken).send({accessToken});
    }).catch((e)=>{
        res.status(400).send(e);

    });
})
//HELPER METHODS

let deleteTasksFromList = (_listId)=>{
    Task.deleteMany({
        _listId
    }).then(()=>{
        console.log("tasks from list id were deleted" + _listId)
    });

}

//get the app to listen on port 3000
app.listen(3000, () => {
    console.log("Server is listening on port 3000");
})

