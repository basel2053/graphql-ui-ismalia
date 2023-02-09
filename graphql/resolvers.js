const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Post = require('../models/post');

const clearImage = require('../util/file');

module.exports = {
	createUser: async (args, req) => {
		const { email, name, password } = args.userInput;
		const errors = [];
		if (!validator.isEmail(email)) {
			errors.push({ message: 'E-mail is invalid.' });
		}
		if (validator.isEmpty(password) || validator.isLength(password, { min: 5, max: 16 })) {
			errors.push({ message: 'Password is too short' });
		}
		if (errors.length > 0) {
			const error = new Error('Invalid Input');
			error.data = errors;
			error.code = 422;
			throw error;
		}
		const existingUser = await User.findOne({ email });
		if (existingUser) {
			const error = new Error('User exists already');
			throw error;
		}
		const hashedPassword = await bcrypt.hash(password, 12);
		const user = new User({ email, name, password: hashedPassword });
		const createdUser = await user.save();
		return {
			...createdUser._doc,
			_id: createdUser._id.toString(),
		};
	},
	login: async ({ email, password }) => {
		const user = await User.findOne({ email });
		if (!user) {
			const error = new Error('user not found');
			error.code = 401;
			throw error;
		}
		const isValid = await bcrypt.compare(password, user.password);
		if (!isValid) {
			const error = new Error('Password is incorrect');
			error.code = 404;
			throw error;
		}
		console.log(user._id);
		const token = jwt.sign({ userId: user._id.toString(), email: user.email }, 'Secret', { expiresIn: '1h' });
		return { token, userId: user._id.toString() };
	},
	createPost: async ({ postInput }, req) => {
		if (!req.isAuth) {
			const error = new Error('Not Authenticated');
			error.code = 401;
			throw error;
		}
		const errors = [];
		if (validator.isEmpty(postInput.title) || !validator.isLength(postInput.title, { min: 5 })) {
			errors.push({ message: 'Title is invalid' });
		}
		if (validator.isEmpty(postInput.content) || !validator.isLength(postInput.content, { min: 5 })) {
			errors.push({ message: 'Content is invalid' });
		}
		if (errors.length > 0) {
			const error = new Error('Invalid Input');
			error.data = errors;
			error.code = 422;
			throw error;
		}
		const user = await User.findById(req.userId);
		if (!user) {
			const error = new Error('Invalid user');
			error.data = errors;
			error.code = 401;
			throw error;
		}
		const post = new Post({
			title: postInput.title,
			content: postInput.content,
			imageUrl: postInput.imageUrl,
			creator: user,
		});
		const createdPost = await post.save();
		// add post to users posts
		user.posts.push(createdPost);
		await user.save();
		return {
			...createdPost._doc,
			_id: createdPost._id.toString(),
			// converting it to string because graphql cant deal with dates
			createdAt: createdPost.createdAt.toISOString(),
			updatedAt: createdPost.updatedAt.toISOString(),
		};
	},
	posts: async ({ page }, req) => {
		if (!req.isAuth) {
			const error = new Error('Not Authenticated');
			error.code = 401;
			throw error;
		}
		if (!page) {
			page = 1;
		}
		const perPage = 2;
		const totalPosts = await Post.find().countDocuments();
		const posts = await Post.find()
			.sort({ createdAt: -1 })
			.skip((page - 1) * perPage)
			.limit(2)
			.populate('creator');
		return {
			posts: posts.map(p => {
				return {
					...p._doc,
					_id: p._id.toString(),
					createdAt: p.createdAt.toISOString(),
					updatedAt: p.updatedAt.toISOString(),
				};
			}),
			totalPosts,
		};
	},
	post: async ({ id }, req) => {
		if (!req.isAuth) {
			const error = new Error('Not Authenticated');
			error.code = 401;
			throw error;
		}
		const post = await Post.findById(id).populate('creator');
		if (!post) {
			const error = new Error('no post found');
			error.code = 404;
			throw error;
		}
		return {
			...post._doc,
			_id: post._id.toString(),
			createdAt: post.createdAt.toISOString(),
			updatedAt: post.updatedAt.toISOString(),
		};
	},
	updatePost: async ({ id, postInput }, req) => {
		if (!req.isAuth) {
			const error = new Error('Not Authenticated');
			error.code = 401;
			throw error;
		}
		const post = await Post.findById(id).populate('creator');
		if (!post) {
			const error = new Error('no post found');
			error.code = 404;
			throw error;
		}
		if (post.creator._id.toString() !== req.userId.toString()) {
			const error = new Error('Not Authorized');
			error.code = 403;
			throw error;
		}
		const errors = [];
		if (validator.isEmpty(postInput.title) || !validator.isLength(postInput.title, { min: 5 })) {
			errors.push({ message: 'Title is invalid' });
		}
		if (validator.isEmpty(postInput.content) || !validator.isLength(postInput.content, { min: 5 })) {
			errors.push({ message: 'Content is invalid' });
		}
		if (errors.length > 0) {
			const error = new Error('Invalid Input');
			error.data = errors;
			error.code = 422;
			throw error;
		}
		post.title = postInput.title;
		post.content = postInput.content;
		if (postInput.imageUrl !== 'undefined') {
			post.imageUrl = postInput.imageUrl;
		}
		const updatedPost = await post.save();
		return {
			...updatedPost._doc,
			_id: updatedPost._id.toString(),
			createdAt: updatedPost.createdAt.toISOString(),
			updatedAt: updatedPost.updatedAt.toISOString(),
		};
	},
	deletePost: async ({ id }, req) => {
		if (!req.isAuth) {
			const error = new Error('Not Authenticated');
			error.code = 401;
			throw error;
		}
		const post = await Post.findById(id);
		if (!post) {
			const error = new Error('no post found');
			error.code = 404;
			throw error;
		}
		if (post.creator._id.toString() !== req.userId.toString()) {
			const error = new Error('Not Authorized');
			error.code = 403;
			throw error;
		}
		clearImage(post.imageUrl);
		await Post.findByIdAndRemove(id);
		const user = await User.findById(req.userId);
		// pull the id of post we just deleted
		user.posts.pull(id);
		await user.save();
		return true;
	},
	user: async (args, req) => {
		if (!req.isAuth) {
			const error = new Error('Not Authenticated');
			error.code = 401;
			throw error;
		}
		const user = await User.findById(req.userId);
		if (!user) {
			const error = new Error('no post found');
			error.code = 404;
			throw error;
		}
		return {
			...user._doc,
			_id: user._id.toString(),
		};
	},
	updateStatus: async ({ status }, req) => {
		if (!req.isAuth) {
			const error = new Error('Not Authenticated');
			error.code = 401;
			throw error;
		}
		const user = await User.findById(req.userId);
		if (!user) {
			const error = new Error('no post found');
			error.code = 404;
			throw error;
		}
		user.status = status;
		await user.save();
		return {
			...user._doc,
			_id: user._id.toString(),
		};
	},
};
