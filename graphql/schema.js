const { buildSchema } = require('graphql');

module.exports = buildSchema(`
type Post{
    _id:ID!
    title:String!
    content:String!
    imageUrl:String!
    Creator:User!
    createdAt:String!
    updatedAt:String!
}

type PostsData{
posts:[Post!]!
totalPosts:Int!
}

type AuthData{
    token:String!
    userId:String!
}

type User{
    _id:ID!
    name:String!
    email:String!
    password:String
    status:String!
    posts:[Post]
}
input userData{
    email:String!
    name:String
    password:String
}

input postData{
    title:String!
    content:String!
    imageUrl:String!

}

type Query{
    login(email:String!,password:String!):AuthData!
    posts(page:Int):PostsData!
    post(id:ID!):Post!
    user:User!
}

type Mutation{
    createUser(userInput:userData):User
    createPost(postInput:postData):Post
    updatePost(id:ID!,postInput:postData):Post!
    deletePost(id:ID!):Boolean
    updateStatus(status:String!):User!
}

`);
