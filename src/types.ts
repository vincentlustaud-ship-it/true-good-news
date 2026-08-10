export type NewsItem = {
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  summary: string;
};

export type NewsResponse = {
  generatedAt: string;
  count: number;
  items: NewsItem[];
};
