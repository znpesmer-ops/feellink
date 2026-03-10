export declare class CreatePostDto {
    caption?: string;
    title?: string;
    media?: Array<{
        url: string;
        type: string;
        order: number;
    }>;
    location?: string;
    type?: string;
    colorPalette?: string[];
}
