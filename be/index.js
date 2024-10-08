const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken')
const User = require('./models/User');
const Message = require('./models/Message');
const cookieParser = require('cookie-parser')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const ws = require('ws')
const fs = require('fs')



dotenv.config();
mongoose.connect(process.env.MONGO_URL)
const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);

const app = express();
app.use('/uploads',express.static(__dirname+'/uploads'))
app.use(express.json())
app.use(cookieParser())
app.use(cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
}));


async function getUserDataFromRequest(req)
{
    return new Promise((resolve,reject) => {

        const token = req.cookies?.token;
        if(token)
            {
                jwt.verify(token,jwtSecret,{},(err,userData) => {
                    if(err) throw err;
                    resolve(userData)
                })
            }
            else
            reject('No Token')
    })
}

app.get('/test',(req,res) => 
{
    res.json('test ok');
})

app.post('/register', async(req,res) => 
{
    const {username,password} = req.body;
    try{
        const hashedPassword = bcrypt.hashSync(password,bcryptSalt)
        const createdUser = await User.create({
            username: username,
            password: hashedPassword});
        jwt.sign({userId: createdUser._id,username},jwtSecret,{},(err,token) => {
            if(err)
                throw err;
            res.cookie('token',token).status(201).json({
                id:createdUser._id
            });
        })
    } catch(err){
        if(err) throw err;
        res.status(500).json('error');
    }
    
})

app.post('/login',async(req,res) => {
    const {username,password} = req.body;
    const foundUser = await User.findOne({username});
    if(foundUser)
    {
        const passOk = bcrypt.compareSync(password,foundUser.password)
        if(passOk)
        {
            jwt.sign({userId: foundUser._id,username},jwtSecret,{},(err,token) => {
                if(err)
                    throw err;
                res.cookie('token',token).status(201).json({
                    id:foundUser._id
                });
            })
        }
    }

})

app.post('/logout',(req,res) => {
    res.cookie('token','').json('ok')
})

app.get('/profile',(req,res) => {
    const {token} = req.cookies;
    if(token)
    {

        jwt.verify(token,jwtSecret,{},(err,userData) => 
            {
                if(err) throw err;
                res.json(userData)
            })
    }
    else
    res.status(401).json('no token')
})

app.get('/messages/:userId',async(req,res) => {
    const {userId} = req.params;
    const userData = await getUserDataFromRequest(req);
    const ourUserId = userData.userId;
    const messages = await Message.find({
        sender: {$in: [userId,ourUserId]},
        recepient: {$in: [userId,ourUserId]},
    });

    res.json(messages) 

})

app.get('/people',async(req,res) => {
    const users = await User.find({},{'_id' : 1,username: 1});
    res.json(users)
})

const server = app.listen(4000);

const wss = new ws.WebSocketServer({server});

wss.on('connection',(connection,req) => {

    function notifyAboutOnlinePeople() {
        [...wss.clients].forEach(client => {
            client.send(JSON.stringify(
                {
                    online: [...wss.clients].map(c => ({userId: c.userId,username: c.username}))
                }
            ))
        })
    }

    connection.isAlive = true;
    
    connection.timer = setInterval(() => {
        connection.ping();
        connection.deathTimer = setTimeout(() => {
            connection.isAlive = false;
            clearInterval(connection.timer)
            connection.terminate()
            notifyAboutOnlinePeople()
        },1000);
    },5000)
    
    connection.on('pong',() => {
        clearTimeout(connection.deathTimer);
    })
    
    
    
    // read username and id from the cookie for this connection
    const cookies = req.headers.cookie;
    if(cookies)
    {
    const tokenCookieString = cookies.split(';').find(str => str.startsWith('token='))
    if(tokenCookieString)
    {
        const token = tokenCookieString.split('=')[1];
        if(token)
        {
            jwt.verify(token,jwtSecret,{},(err,userData) => {
                if(err) throw err;
                const {userId,username} = userData;
                connection.userId = userId;
                connection.username = username;
            })
        }
    }
    }

    connection.on('message',async(message) => {
        const msg = JSON.parse(message.toString());
        const {recepient,text,file} = msg;

        let filename = null;
        if(file)
        {
            const parts = file.name.split('.');
            const ext = parts[parts.length - 1];
            filename = Date.now() + '.' + ext;
            const path = __dirname + '/uploads/' + filename;
            const bufferData = Buffer.from(file.data.split(',')[1],'base64');
            fs.writeFile(path,bufferData,(err) => {
                if(err) console.log(err)
                console.log('file Saved ' + path)
            })
        }

        if(recepient && (text || file))
        {
            const messageDoc = await Message.create({
                sender: connection.userId,
                recepient,
                text,
                file: file? filename : null,
            });

            [...wss.clients].filter(c => c.userId === recepient)
            .forEach(c => c.send(JSON.stringify({
                text,
                sender: connection.userId,
                recepient,
                file: file ? filename : null,
                _id: messageDoc._id
            })))
        }
    });

    // notify everyone about online people (when someone connects)
    notifyAboutOnlinePeople()
  
})

