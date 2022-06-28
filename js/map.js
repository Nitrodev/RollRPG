class Area {
  constructor(data) {
    this.id = data.id;
    this.description = data.description;
  }

  get name() {
    return lang[currentLanguage][this.id];
  }
}