// Redshift
// -------
import inherits from 'inherits';
import Client_PG from '../postgres';
import { assign, map } from 'lodash';

import Transaction from './transaction';
import QueryCompiler from './query/compiler';
import ColumnBuilder from './schema/columnbuilder';
import ColumnCompiler from './schema/columncompiler';
import TableCompiler from './schema/tablecompiler';
import SchemaCompiler from './schema/compiler';

function Client_Redshift(config) {
  Client_PG.apply(this, arguments);
}
inherits(Client_Redshift, Client_PG);

assign(Client_Redshift.prototype, {
  transaction() {
    return new Transaction(this, ...arguments);
  },

  queryCompiler() {
    return new QueryCompiler(this, ...arguments);
  },

  columnBuilder() {
    return new ColumnBuilder(this, ...arguments);
  },

  columnCompiler() {
    return new ColumnCompiler(this, ...arguments);
  },

  tableCompiler() {
    return new TableCompiler(this, ...arguments);
  },

  schemaCompiler() {
    return new SchemaCompiler(this, ...arguments);
  },

  dialect: 'redshift',

  driverName: 'pg-redshift',

  _driver() {
    return require('pg');
  },


  _escapeBinding: makeEscape({
    escapeArray(val, esc) {
      return esc(arrayString(val, esc));
    },
    escapeString(str) {
      let hasBackslash = false;
      let escaped = "'";
      for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (c === "'") {
          escaped += c + c;
        } else if (c === '\\') {
          escaped += c + c;
          hasBackslash = true;
        } else {
          escaped += c;
        }
      }
      escaped += "'";
// removed by Gabi 29/7/2018 - redshift does not support Escaped literal as postgres
//      if (hasBackslash === true) {
//        escaped = 'E' + escaped;
//      }
      return escaped;
    },
    escapeObject(val, prepareValue, timezone, seen = []) {
      if (val && typeof val.toPostgres === 'function') {
        seen = seen || [];
        if (seen.indexOf(val) !== -1) {
          throw new Error(
            `circular reference detected while preparing "${val}" for query`
          );
        }
        seen.push(val);
        return prepareValue(val.toPostgres(prepareValue), seen);
      }
      return JSON.stringify(val);
    },
  }),
/*
  _escapeBinding: makeEscape({
    escapeArray(val, esc) {
      return esc(arrayString(val, esc))
    },
    escapeString(str) {
      let hasBackslash = false
      let escaped = '\''
      for (let i = 0; i < str.length; i++) {
        const c = str[i]
        if (c === '\'') {
          escaped += c + c
        } else if (c === '\\') {
          escaped += c + c
          hasBackslash = true
        } else {
          escaped += c
        }
      }
      escaped += '\''
// removed by Lior H. 6/2/2018 - redshift does not support Escaped literal as postgres
      // if (hasBackslash === true) {
      //   escaped = 'E' + escaped
      // }

      return escaped
    },
    escapeObject(val, prepareValue, timezone, seen = []) {
      if (val && typeof val.toPostgres === 'function') {
        seen = seen || [];
        if (seen.indexOf(val) !== -1) {
          throw new Error(`circular reference detected while preparing "${val}" for query`);
        }
        seen.push(val);
        return prepareValue(val.toPostgres(prepareValue), seen);
      }
      return JSON.stringify(val);
    }
  }),
*/
  // Ensures the response is returned in the same format as other clients.
  processResponse(obj, runner) {
    const resp = obj.response;
    if (obj.output) return obj.output.call(runner, resp);
    if (obj.method === 'raw') return resp;
    if (resp.command === 'SELECT') {
      if (obj.method === 'first') return resp.rows[0];
      if (obj.method === 'pluck') return map(resp.rows, obj.pluck);
      return resp.rows;
    }
    if (
      resp.command === 'INSERT' ||
      resp.command === 'UPDATE' ||
      resp.command === 'DELETE'
    ) {
      return resp.rowCount;
    }
    return resp;
  },
});

export default Client_Redshift;
