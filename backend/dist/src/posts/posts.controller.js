"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostsController = void 0;
const common_1 = require("@nestjs/common");
const containsBadWord_1 = require("../common/utils/containsBadWord");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const posts_service_1 = require("./posts.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const media_service_1 = require("../media/media.service");
const create_post_dto_1 = require("./dto/create-post.dto");
const post_id_dto_1 = require("./dto/post-id.dto");
const create_comment_dto_1 = require("./dto/create-comment.dto");
let PostsController = class PostsController {
    constructor(postsService, mediaService) {
        this.postsService = postsService;
        this.mediaService = mediaService;
    }
    async createPost(user, files, body) {
        console.log('🚀 [POST /posts/create] Request received:', {
            userId: user?.id,
            filesCount: files?.length || 0,
            bodyType: body?.type || 'post',
            caption: body?.caption?.substring(0, 50) || 'none',
        });
        try {
            if (!files || files.length === 0) {
                console.error('❌ [POST /posts/create] No files uploaded');
                throw new common_1.BadRequestException('En az bir dosya gereklidir');
            }
            if (!user?.id) {
                console.error('❌ [POST /posts/create] No user ID');
                throw new common_1.BadRequestException('Kullanıcı kimliği bulunamadı');
            }
            console.log('📤 [POST /posts/create] Starting media uploads...');
            const mediaUploads = await Promise.all(files.map(async (file, index) => {
                console.log(`📁 [POST /posts/create] Uploading file ${index + 1}/${files.length}: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
                try {
                    const uploadResult = await this.mediaService.uploadFile(file, 'posts');
                    console.log(`✅ [POST /posts/create] File ${index + 1} uploaded: ${uploadResult.url.substring(0, 50)}...`);
                    return {
                        url: typeof uploadResult === 'string' ? uploadResult : uploadResult.url,
                        type: file.mimetype.startsWith('video/') ? 'video' : 'image',
                        order: index,
                    };
                }
                catch (uploadError) {
                    console.error(`❌ [POST /posts/create] File ${index + 1} upload failed:`, {
                        message: uploadError?.message,
                        stack: uploadError?.stack?.split('\n').slice(0, 3),
                    });
                    throw new common_1.BadRequestException(`Dosya yükleme hatası: ${uploadError instanceof Error ? uploadError.message : 'Bilinmeyen hata'}`);
                }
            }));
            console.log(`✅ [POST /posts/create] All ${mediaUploads.length} files uploaded successfully`);
            let colorPalette;
            if (body.colorPalette) {
                if (typeof body.colorPalette === 'string') {
                    try {
                        colorPalette = JSON.parse(body.colorPalette);
                    }
                    catch {
                        colorPalette = [body.colorPalette];
                    }
                }
                else if (Array.isArray(body.colorPalette)) {
                    colorPalette = body.colorPalette;
                }
            }
            const dto = {
                caption: body.caption,
                title: body.title,
                location: body.location,
                type: body.type || 'post',
                media: mediaUploads,
                colorPalette,
            };
            console.log('💾 [POST /posts/create] Creating post in database...');
            const post = await this.postsService.createPost(user.id, dto);
            console.log(`✅ [POST /posts/create] Post created successfully: ${post.id}`);
            return post;
        }
        catch (error) {
            console.error('❌ [POST /posts/create] Final error:', {
                message: error?.message,
                name: error?.name,
                status: error?.status,
                stack: error?.stack?.split('\n').slice(0, 3),
            });
            if (error instanceof common_1.BadRequestException || error instanceof Error && 'status' in error) {
                throw error;
            }
            throw new common_1.BadRequestException(error instanceof Error ? error.message : 'Gönderi oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
        }
    }
    async createPostWithUrls(user, dto) {
        return this.postsService.createPost(user.id, dto);
    }
    async getQrLabel(id, res) {
        const pdf = await this.postsService.generateQrLabelPdf(id);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="Eser_Etiketi_${id}.pdf"`,
        });
        return res.send(pdf);
    }
    async generateArtworkQrPdf(postId, res) {
        return this.postsService.generateArtworkQrPdf(postId, res);
    }
    async getPost(params, user) {
        return this.postsService.getPost(params.id, user.id);
    }
    async updatePost(params, user, body) {
        return this.postsService.updatePost(params.id, user.id, { caption: body.caption, title: body.title });
    }
    async deletePost(params, user) {
        if (!user || !user.id) {
            throw new common_1.BadRequestException('Kullanıcı doğrulaması başarısız');
        }
        return this.postsService.deletePost(params.id, user.id);
    }
    async likePost(params, user) {
        return this.postsService.likePost(params.id, user.id);
    }
    async unlikePost(params, user) {
        return this.postsService.unlikePost(params.id, user.id);
    }
    async createComment(params, user, dto) {
        if ((0, containsBadWord_1.containsBadWord)(dto.content)) {
            throw new common_1.BadRequestException('Bu yorum topluluk kurallarına uygun değil.');
        }
        return this.postsService.createComment(params.id, user.id, dto.content, dto.parentId);
    }
    async getComments(params, parentId) {
        return this.postsService.getComments(params.id, parentId);
    }
    async getUserPosts(userId, user) {
        return this.postsService.getUserPosts(userId, user.id);
    }
    async getUserComments(userId) {
        return this.postsService.getUserComments(userId);
    }
    async savePost(params, user) {
        return this.postsService.savePost(params.id, user.id);
    }
    async unsavePost(params, user) {
        return this.postsService.unsavePost(params.id, user.id);
    }
    async getSavedPosts(user) {
        console.log('🔖 [GET /posts/saved] ========== START ==========');
        console.log('🔖 [GET /posts/saved] Request from user:', {
            id: user?.id,
            username: user?.username,
            hasUser: !!user,
        });
        if (!user?.id) {
            console.error('❌ [GET /posts/saved] No user ID - returning empty array');
            return [];
        }
        try {
            console.log('🔖 [GET /posts/saved] Calling service.getSavedPosts...');
            const result = await this.postsService.getSavedPosts(user.id);
            console.log('✅ [GET /posts/saved] Service returned', result.length, 'posts');
            if (result.length > 0) {
                console.log('✅ [GET /posts/saved] First post:', {
                    id: result[0]?.id,
                    hasMedia: !!result[0]?.media,
                    mediaCount: result[0]?.media?.length,
                    userId: result[0]?.userId,
                });
            }
            else {
                console.warn('⚠️ [GET /posts/saved] SERVICE RETURNED EMPTY! userId:', user.id);
            }
            console.log('🔖 [GET /posts/saved] ========== END ==========');
            return result;
        }
        catch (error) {
            console.error('❌ [GET /posts/saved] ========== EXCEPTION CAUGHT ==========');
            console.error('❌ [GET /posts/saved] Error message:', error?.message);
            console.error('❌ [GET /posts/saved] Error name:', error?.name);
            console.error('❌ [GET /posts/saved] Error stack:', error?.stack);
            console.error('❌ [GET /posts/saved] User ID:', user?.id);
            console.error('❌ [GET /posts/saved] ========== END EXCEPTION ==========');
            console.warn('⚠️ [GET /posts/saved] Returning empty array due to exception');
            return [];
        }
    }
    async saveArtwork(params, user) {
        return this.postsService.saveArtwork(params.id, user.id);
    }
    async unsaveArtwork(params, user) {
        return this.postsService.unsaveArtwork(params.id, user.id);
    }
    async updateComment(postId, commentId, dto, user) {
        if ((0, containsBadWord_1.containsBadWord)(dto.content)) {
            throw new common_1.BadRequestException('Bu yorum topluluk kurallarına uygun değil.');
        }
        return this.postsService.updateComment(commentId, user.id, dto.content);
    }
    async deleteComment(postId, commentId, user) {
        if (!user || !user.id) {
            throw new common_1.BadRequestException('Kullanıcı doğrulaması başarısız');
        }
        return this.postsService.deleteComment(commentId, user.id);
    }
    async toggleCommentLike(commentId, user) {
        return this.postsService.toggleCommentLike(commentId, user.id);
    }
    async toggleCommentReaction(commentId, user, dto) {
        return this.postsService.toggleCommentReaction(user.id, commentId, dto.emoji);
    }
    async getCommentReactions(commentId) {
        return this.postsService.getCommentReactions(commentId);
    }
    async getUserCommentReactions(commentId, user) {
        return this.postsService.getUserCommentReactions(commentId, user.id);
    }
    async toggleCommentPin(commentId, user, body) {
        return this.postsService.toggleCommentPin(commentId, user.id, body.pinned);
    }
    async getColorMatches(userId) {
        return this.postsService.getColorMatches(userId);
    }
    async getUserColorPalette(userId) {
        const palette = await this.postsService.getUserColorPalette(userId);
        return { palette };
    }
    async generateArtworkTicket(artworkId, userId, res) {
        const pdf = await this.postsService.generateArtworkTicket(artworkId, userId);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="Feellink_Bilet_${artworkId}.pdf"`,
        });
        return res.send(pdf);
    }
};
exports.PostsController = PostsController;
__decorate([
    (0, common_1.Post)('create'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('files', 10)),
    (0, swagger_1.ApiOperation)({ summary: 'Create post with file upload' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Post created successfully' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFiles)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Array, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "createPost", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Create post with media URLs' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Post created successfully' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_post_dto_1.CreatePostDto]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "createPostWithUrls", null);
__decorate([
    (0, common_1.Get)(':id/qr-label'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Generate QR code label PDF for artwork' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'QR label PDF generated successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "getQrLabel", null);
__decorate([
    (0, common_1.Get)(':id/qr-pdf'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Generate QR code PDF label for artwork' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'QR PDF generated successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "generateArtworkQrPdf", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get post by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Post retrieved successfully' }),
    __param(0, (0, common_1.Param)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [post_id_dto_1.PostIdDto, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "getPost", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Update a post' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Post updated successfully' }),
    __param(0, (0, common_1.Param)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [post_id_dto_1.PostIdDto, Object, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "updatePost", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Delete post' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Post deleted successfully' }),
    __param(0, (0, common_1.Param)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [post_id_dto_1.PostIdDto, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "deletePost", null);
__decorate([
    (0, common_1.Post)(':id/like'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Like a post' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Post liked successfully' }),
    __param(0, (0, common_1.Param)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [post_id_dto_1.PostIdDto, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "likePost", null);
__decorate([
    (0, common_1.Delete)(':id/like'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Unlike a post' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Post unliked successfully' }),
    __param(0, (0, common_1.Param)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [post_id_dto_1.PostIdDto, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "unlikePost", null);
__decorate([
    (0, common_1.Post)(':id/comments'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Add comment to post' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Comment added successfully' }),
    __param(0, (0, common_1.Param)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [post_id_dto_1.PostIdDto, Object, create_comment_dto_1.CreateCommentDto]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "createComment", null);
__decorate([
    (0, common_1.Get)(':id/comments'),
    (0, swagger_1.ApiOperation)({ summary: 'Get post comments' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Comments retrieved successfully' }),
    __param(0, (0, common_1.Param)()),
    __param(1, (0, common_1.Query)('parentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [post_id_dto_1.PostIdDto, String]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "getComments", null);
__decorate([
    (0, common_1.Get)('user/:userId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get user posts' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User posts retrieved successfully' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "getUserPosts", null);
__decorate([
    (0, common_1.Get)('comments/user/:userId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get all comments by user' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User comments retrieved successfully' }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "getUserComments", null);
__decorate([
    (0, common_1.Post)(':id/save'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Save a post' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Post saved successfully' }),
    __param(0, (0, common_1.Param)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [post_id_dto_1.PostIdDto, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "savePost", null);
__decorate([
    (0, common_1.Delete)(':id/save'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Unsave a post' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Post unsaved successfully' }),
    __param(0, (0, common_1.Param)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [post_id_dto_1.PostIdDto, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "unsavePost", null);
__decorate([
    (0, common_1.Get)('saved'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get saved posts' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Saved posts retrieved successfully' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "getSavedPosts", null);
__decorate([
    (0, common_1.Post)(':id/save-artwork'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Save an artwork' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Artwork saved successfully' }),
    __param(0, (0, common_1.Param)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [post_id_dto_1.PostIdDto, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "saveArtwork", null);
__decorate([
    (0, common_1.Delete)(':id/save-artwork'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Unsave an artwork' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Artwork unsaved successfully' }),
    __param(0, (0, common_1.Param)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [post_id_dto_1.PostIdDto, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "unsaveArtwork", null);
__decorate([
    (0, common_1.Patch)(':id/comments/:commentId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Update a comment' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Comment updated successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('commentId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, create_comment_dto_1.CreateCommentDto, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "updateComment", null);
__decorate([
    (0, common_1.Delete)(':id/comments/:commentId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a comment' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Comment deleted successfully' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('commentId')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "deleteComment", null);
__decorate([
    (0, common_1.Post)('comments/:commentId/like'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Toggle comment like' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Comment like toggled successfully' }),
    __param(0, (0, common_1.Param)('commentId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "toggleCommentLike", null);
__decorate([
    (0, common_1.Post)('comments/:commentId/react'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Toggle comment reaction' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Reaction toggled successfully' }),
    __param(0, (0, common_1.Param)('commentId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "toggleCommentReaction", null);
__decorate([
    (0, common_1.Get)('comments/:commentId/reactions'),
    (0, swagger_1.ApiOperation)({ summary: 'Get comment reactions' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Reactions retrieved successfully' }),
    __param(0, (0, common_1.Param)('commentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "getCommentReactions", null);
__decorate([
    (0, common_1.Get)('comments/:commentId/reactions/me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get current user reactions for comment' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'User reactions retrieved successfully' }),
    __param(0, (0, common_1.Param)('commentId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "getUserCommentReactions", null);
__decorate([
    (0, common_1.Post)('comments/:commentId/pin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Pin or unpin a comment' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Comment pin status updated successfully' }),
    __param(0, (0, common_1.Param)('commentId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "toggleCommentPin", null);
__decorate([
    (0, common_1.Get)('color-matches/:userId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get color matches for user artworks' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Color matches retrieved successfully' }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "getColorMatches", null);
__decorate([
    (0, common_1.Get)('color-palette/:userId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get user color palette from artworks' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Color palette retrieved successfully' }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "getUserColorPalette", null);
__decorate([
    (0, common_1.Get)('ticket/:artworkId/:userId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Generate Premium Bilet PDF for artwork' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Premium Bilet PDF generated successfully' }),
    __param(0, (0, common_1.Param)('artworkId')),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], PostsController.prototype, "generateArtworkTicket", null);
exports.PostsController = PostsController = __decorate([
    (0, swagger_1.ApiTags)('posts'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('posts'),
    __metadata("design:paramtypes", [posts_service_1.PostsService,
        media_service_1.MediaService])
], PostsController);
//# sourceMappingURL=posts.controller.js.map