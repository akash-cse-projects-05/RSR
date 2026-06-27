const mongoose = require("mongoose");
const tenantLocalStorage = require("./tenantStore");

function createTenantModelProxy(modelName, schema) {
  function getActiveModel() {
    const store = tenantLocalStorage.getStore();
    const connection = (store && store.connection) || mongoose.connection;
    
    if (connection === mongoose.connection) {
      if (!mongoose.models[modelName]) {
        mongoose.model(modelName, schema);
      }
      return mongoose.model(modelName);
    } else {
      if (!connection.models[modelName]) {
        connection.model(modelName, schema);
      }
      return connection.model(modelName);
    }
  }

  return new Proxy(function() {}, {
    construct(target, args) {
      const ActiveModel = getActiveModel();
      return new ActiveModel(...args);
    },
    get(target, prop) {
      if (prop === 'prototype') {
        return getActiveModel().prototype;
      }
      const activeModel = getActiveModel();
      const value = activeModel[prop];
      if (typeof value === "function") {
        return value.bind(activeModel);
      }
      return value;
    }
  });
}

module.exports = createTenantModelProxy;
