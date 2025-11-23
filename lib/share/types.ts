export interface ShareLinkResponse {
  id: string;
  shareToken: string;
  shareUrl: string;
  projectId: string;
  createdAt: string;
}

export interface CreateShareLinkRequest {
  projectId: string;
}

export interface PublicShareData {
  projectName: string;
  companyName: string;
  videoUrl: string;
}
