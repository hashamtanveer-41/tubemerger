const React = require('react');

module.exports = new Proxy(
  {},
  {
    get: (_target, prop) => {
      const MockIcon = (props) => React.createElement('MockIcon-' + String(prop), props);
      MockIcon.displayName = String(prop);
      return MockIcon;
    },
  }
);
