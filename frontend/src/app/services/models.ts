export interface User {
  id: string;
  username: string;
  email: string;
  bio: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  content: string;
  createdBy: string;
  authorUsername?: string;
  postId: string;
  createdAt: string;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  imageUrl: string;
  imageAlt: string;
  linkUrl: string;
  color: string;
  createdBy: string;
  authorUsername?: string;
  createdAt: string;
  likes: string[];
  comments: Comment[];
}
