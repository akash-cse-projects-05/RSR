const mongoose = require("mongoose");
const tenantLocalStorage = require("./tenantStore");

const registeredSchemas = {};
const initializedConnections = new WeakSet();

function registerAllSchemasOnConnection(connection) {
  if (initializedConnections.has(connection)) return;
  initializedConnections.add(connection);
  
  for (const [name, schema] of Object.entries(registeredSchemas)) {
    if (!connection.models[name]) {
      connection.model(name, schema);
    }
  }
}

function createTenantModelProxy(modelName, schema) {
  // Save the schema in our registry so we can register it on connection initialization
  registeredSchemas[modelName] = schema;

  function getActiveModel() {
    const store = tenantLocalStorage.getStore();
    const connection = (store && store.connection) || mongoose.connection;
    
    // Register all registered schemas on the active connection to support cross-model population
    registerAllSchemasOnConnection(connection);

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
