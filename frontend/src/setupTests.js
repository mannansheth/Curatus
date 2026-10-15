global.IS_REACT_ACT_ENVIRONMENT = true;
HTMLElement.prototype.scrollIntoView = jest.fn();
HTMLElement.prototype.scrollTo = jest.fn();
global.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
