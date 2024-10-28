var express = require('express');
var router = express.Router();
var mongoose=require('mongoose');
/* GET home page. */
var dotenv=require('dotenv')
var bcrypt=require('bcryptjs')
var jwt=require('jsonwebtoken')

var auth=require('../middleware/auth.js')

dotenv.config()

mongoose.connect(process.env.CONNECTION_URL,{useNewUrlParser:true,useUnifiedTopology:true},function(err,result){
  if(err)
  {
    console.log(`Error is: ${err}`)

  }
  else if(result){
    console.log("Connection Successful")
    //console.log(result)
  }
})

const postSchema=mongoose.Schema({
  title:String,
  message: String,
  name:String,
  creator:String,
  tags:[String],
  selectedFile: String,
  likes:{
    type:[String],
    default:[],
  },
  createdAt:{
    type: Date,
    default:new Date(),
  }
})

const userSchema=mongoose.Schema({
  name:{type:String, required:true},
  email:{type:String, required:true},
  password:{type:String,required:true},
  id:{type:String}
})

const PostMessage=mongoose.model('PostMessage',postSchema)

const User=mongoose.model('User',userSchema)

router.get('/', async function(req, res, next) {
  try{
      const postMessage= await PostMessage.find()
      console.log(postMessage)
      res.status(200).json(postMessage)
  }
  catch(err){
    res.status(404).json({message:err.message})

  }
});

router.post('/',auth,async function(req,res,next){
  const post=req.body
  const newPost=new PostMessage({...post,creator:req.userId,createdAt:new Date().toISOString()})
  try{
      console.log("Reached Here...")
      await newPost.save()
      res.status(201).json(newPost)
  }
  catch(err){
      res.status(409).json({message: err.message})
  }
})

router.patch('/:id',auth,async function(req,res,next){
  const {id:_id}=req.params
  const post=req.body

  if(!mongoose.Types.ObjectId.isValid(_id)){
    return res.status(404).send('No post with that ID')
  }

  const updatedPost=await PostMessage.findByIdAndUpdate(_id,{...post,_id},{new:true});

  res.json(updatedPost);

})

router.delete('/:id',auth,async function(req,res,next){
  const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).send(`No post with id: ${id}`);

    await PostMessage.findByIdAndRemove(id);
    console.log('Delete')
    res.json({ message: "Post deleted successfully." });
})

router.patch('/:id/likePost',auth,async function(req,res,next){
  console.log("Reached here is Like Post")
  const { id } = req.params;
  
  if(!req.userId){
    return res.json({message:'Unauthenticated'})
  }

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).send(`No post with id: ${id}`);
    const post = await PostMessage.findById(id);
    const index=post.likes.findIndex((id)=>id==String(req.userId))
    if(index==-1){
        post.likes.push(req.userId)
    }else{
      post.likes=post.likes.filter((id)=>id!=String(req.userId))
    }
    const updatedPost = await PostMessage.findByIdAndUpdate(id, post, { new: true });
    res.json(updatedPost);

})

router.post('/signin',async function(req,res,next){
    const {email,password}=req.body
    try{
          const existingUser=await User.findOne({email})
          if(!existingUser){
            return res.status(404).json({message:"User don't Exist !!!"})
          }
          const isPasswordCorrect=await bcrypt.compare(password,existingUser.password)
          if(!isPasswordCorrect){
            return res.status(400).json({message:"Invalid Credentials"})
          }
          const token=jwt.sign({email:existingUser.email, id:existingUser._id},'test',{expiresIn:"1h"})
          res.status(200).json({result:existingUser,token})
    }catch(e)
    {
      res.status(500).json({message:"Something Went Wrong"})
    }
})

router.post('/signup',async function(req,res,next){
  const {email,password,confirmPassword,firstName,lastName}=req.body

  try{
        const existingUser=await User.findOne({email})

        if(existingUser){
          return res.status(400).json({message:"User already exists..."})
        }
        if(password != confirmPassword){
          return res.status(400).json({message:"Password don't match..."})
        }

        const hashedPassword=await bcrypt.hash(password,12)

        const result=await User.create({email,password:hashedPassword,name:`${firstName} ${lastName}`})
        const token=jwt.sign({email:result.email, id:result._id},'test',{expiresIn:"1h"})
        res.status(200).json({result,token})
  }catch(e)
  {
    res.status(500).json({message:"Something Went Wrong"})
  }
})

module.exports = router;
