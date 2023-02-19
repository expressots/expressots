class Book {
  public id: number;
  public title: string;
  public author: string;

  constructor(id: number, title: string, author: string) {
    this.id = id;
    this.title = title;
    this.author = author;
  }
}

export { Book };
