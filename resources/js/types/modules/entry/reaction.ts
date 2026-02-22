export interface Reaction {
    emoji: string;
    count: number;
    reactedByUser: boolean;
}

export interface Reactions {
    data: Reaction[];
    links: {
      next: string | null;
      prev: string | null;
    };
}