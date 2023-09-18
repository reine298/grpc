require('dotenv').config({ path: './config.env' });

const PROTO_PATH="./restaurant.proto";

const express = require('express');
const app = express();
const mongoose = require('mongoose');

const Menu = require('../models/menu')

mongoose.set('strictQuery', true);
mongoose.connect(process.env.DATABASE_URL);
const db = mongoose.connection;
db.on('error', (error) => console.error(error));
db.once('open', () => console.log('Connected to Database'));

var grpc = require("@grpc/grpc-js");
var protoLoader = require("@grpc/proto-loader");

var packageDefinition = protoLoader.loadSync(PROTO_PATH,{
    keepCase: true,
    longs: String,
    enums: String,
    arrays: true
});

var restaurantProto =grpc.loadPackageDefinition(packageDefinition);

const {v4: uuidv4}=require("uuid");
const menu = require('../models/menu');

const server = new grpc.Server();

server.addService(restaurantProto.RestaurantService.service,{
    getAllMenu: async(_,callback)=>{
        const menu = await Menu.find();
        callback(null, {menu});
    },
    get: async(call,callback)=>{
        let menuItem = await Menu.findById(call.request.id);

        if(menuItem) {
            callback(null, menuItem);
        }else {
            callback({
                code: grpc.status.NOT_FOUND,
                details: "Not found"
            });
        }
    },
    insert: async(call, callback)=>{
        console.log(call.request);
        const addmenu =new Menu(call.request);
        try {
            const newMenu = await addmenu.save();
            callback(null,newMenu); 
        } catch (err) {
            callback({
                code: grpc.status.NOT_FOUND,
                details: "Not Found"
            });
        }
    },
    update: async(call,callback)=>{
        let existingMenuItem = await Menu.findById(call.request.id);

        if(existingMenuItem){
            existingMenuItem.name=call.request.name;
            existingMenuItem.price=call.request.price;
            existingMenuItem= await existingMenuItem.save();
            callback(null,existingMenuItem);
        } else {
            callback({
                code: grpc.status.NOT_FOUND,
                details: "Not Found"
            });
        }
    },
    remove: async (call, callback) => {
        let existingMenuItem = await Menu.findById(call.request.id);

        if(existingMenuItem){
            await existingMenuItem.deleteOne(existingMenuItem);
            callback(null,{});
        } else {
            callback({
                code: grpc.status.NOT_FOUND,
                details: "NOT Found"
            });
        }
    }
});


server.bindAsync("127.0.0.1:30043",grpc.ServerCredentials.createInsecure(),() => {server.start();});
console.log("Server running at http://127.0.0.1:30043");