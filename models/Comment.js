const mongoose = require('mongoose');

const { Schema } = mongoose;

const commentSchema = new Schema({
	content: {
		type: String,
		require: true,
	},
	userId: {
		type: Schema.Types.ObjectId,
		ref: 'User',
		require: true,
	},
	postId: {
		type: Schema.Types.ObjectId,
		ref: 'Post',
		require: true,
	},
});
const Comment = mongoose.model('Comment', commentSchema);
module.exports = Comment;
