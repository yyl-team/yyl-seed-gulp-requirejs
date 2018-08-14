class Response {
  constructor() {
    this.resFn = {};
    this.triLog = {};
    return this;
  }
  on(eventName, fn) {
    const she = this;
    if (!she.resFn[eventName]) {
      she.resFn[eventName] = [];
    }
    she.resFn[eventName].push(fn);

    if (she.triLog[eventName] && she.triLog[eventName].length) {
      she.triLog[eventName].forEach((argv) => {
        fn(...argv);
      });
    }
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

    if (!she.triLog[eventName]) {
      she.triLog[eventName] = [];
    }
    she.triLog[eventName].push(argv);
    return this;
  }
  off(eventName) {
    const she = this;
    if (eventName) {
      she.resFn[eventName] = [];
      she.triLog[eventName] = [];
    } else {
      she.resFn = {};
      she.triLog = {};
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
