class Response {
  constructor() {
    this.resFn = {};
    return this;
  }
  on(eventName, fn) {
    const she = this;
    if (!she.resFn[eventName]) {
      she.resFn[eventName] = [];
    }
    she.resFn[eventName].push(fn);
    return this;
  }
  trigger(eventName, argv) {
    const she = this;
    const handleFns = she.resFn[eventName];
    if (handleFns && handleFns.length) {
      handleFns.forEach((fn) => {
        fn(...argv);
      });
    }
    return this;
  }
  off(eventName) {
    const she = this;
    if (eventName) {
      she.resFn[eventName] = [];
    } else {
      she.resFn = {};
    }
    return this;
  }
}

const fn = {
  response() {
    return new Response(...arguments);
  }
};
module.exports = fn;
