'use strict';

/* global describe before beforeEach it */

/* eslint-disable */

const assert = require('assert');
const { expect, should } = require('chai');

/* eslint-enable */

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const environment = require('dotenv');
const varium = require('varium');
const { connect } = require('marpat');
const { Filemaker } = require('../index.js');

chai.use(chaiAsPromised);

describe('Edit Capabilities', () => {
  let database, client;
  before(done => {
    environment.config({ path: './tests/.env' });
    varium(process.env, './tests/env.manifest');
    connect('nedb://memory')
      .then(db => {
        database = db;
        return database.dropDatabase();
      })
      .then(() => done());
  });

  beforeEach(done => {
    client = Filemaker.create({
      application: process.env.APPLICATION,
      server: process.env.SERVER,
      user: process.env.USERNAME,
      password: process.env.PASSWORD
    });
    done();
  });

  it('should edit FileMaker records.', () => {
    client.create(process.env.LAYOUT, { name: 'Obi-Wan' }).then(response =>
      expect(
        client.edit(process.env.LAYOUT, response.recordId, {
          name: 'Luke Skywalker'
        })
      )
        .to.eventually.be.a('object')
        .that.has.all.keys('modId')
    );
  });

  it('should reject bad data with an error', () =>
    expect(
      client
        .create(process.env.LAYOUT, { name: 'Obi-Wan' })
        .then(response =>
          client.edit(process.env.LAYOUT, response.recordId, 'junk error')
        )
        .catch(error => error)
    )
      .to.eventually.be.a('object')
      .that.has.all.keys('code', 'message'));

  it('should return an object with merged filemaker and data properties', () => {
    client.create(process.env.LAYOUT, { name: 'Obi-Wan' }).then(response =>
      expect(
        client.edit(
          process.env.LAYOUT,
          response.recordId,
          {
            name: 'Luke Skywalker'
          },
          { merge: true }
        )
      )
        .to.eventually.be.a('object')
        .that.has.all.keys('modId', 'recordId', 'name')
    );
  });

  it('should allow you to run a script when editing a record', () =>
    expect(
      client.create(process.env.LAYOUT, { name: 'Obi-Wan' }).then(response =>
        client.edit(
          process.env.LAYOUT,
          response.recordId,
          {
            name: 'Han Solo'
          },
          { script: 'FMS Triggered Script' }
        )
      )
    )
      .to.eventually.be.a('object')
      .that.has.all.keys('modId', 'scriptResult', 'scriptError'));

  it('should allow you to run a script via a scripts array when editing a record', () =>
    expect(
      client.create(process.env.LAYOUT, { name: 'Obi-Wan' }).then(response =>
        client.edit(
          process.env.LAYOUT,
          response.recordId,
          {
            name: 'Han Solo'
          },
          {
            scripts: [
              { name: 'FMS Triggered Script', param: 'data' },
              {
                name: 'FMS Triggered Script',
                phase: 'prerequest',
                param: { data: 2 }
              }
            ]
          }
        )
      )
    )
      .to.eventually.be.a('object')
      .that.has.all.keys(
        'modId',
        'scriptResult',
        'scriptError.prerequest',
        'scriptResult.prerequest',
        'scriptError'
      ));

  it('should allow you to specify scripts as an array', () =>
    expect(
      client.create(
        process.env.LAYOUT,
        {
          name: 'Han Solo',
          array: ['ben'],
          object: { 'co-pilot': 'chewbacca' },
          height: 52
        },
        {
          scripts: [
            { name: 'FMS Triggered Script', param: 'data' },
            {
              name: 'FMS Triggered Script',
              phase: 'prerequest',
              param: { data: 2 }
            }
          ]
        }
      )
    )
      .to.eventually.be.a('object')
      .that.has.all.keys(
        'recordId',
        'modId',
        'scriptResult',
        'scriptError.prerequest',
        'scriptResult.prerequest',
        'scriptError'
      ));

  it('should allow you to specify scripts as an array with a merge response', () => {
    return expect(
      client.create(
        process.env.LAYOUT,
        {
          name: 'Han Solo',
          array: ['ben'],
          object: { 'co-pilot': 'chewbacca' },
          height: 52
        },
        {
          script: 'FMS Triggered Script',
          merge: true,
          scripts: [{ name: 'FMS Triggered Script', phase: 'prerequest' }]
        }
      )
    )
      .to.eventually.be.a('object')
      .that.has.all.keys(
        'recordId',
        'name',
        'array',
        'object',
        'height',
        'modId',
        'scriptResult',
        'scriptError.prerequest',
        'scriptResult.prerequest',
        'scriptError'
      );
  });

  it('should sanitize parameters when creating a new record', () => {
    return expect(
      client.create(
        process.env.LAYOUT,
        {
          name: 'Han Solo',
          array: ['ben'],
          object: { 'co-pilot': 'chewbacca' },
          height: 52
        },
        {
          script: 'FMS Triggered Script',
          'script.param': 1,
          merge: true,
          scripts: [
            {
              name: 'FMS Triggered Script',
              param: { data: true },
              phase: 'prerequest'
            }
          ]
        }
      )
    )
      .to.eventually.be.a('object')
      .that.has.all.keys(
        'recordId',
        'name',
        'array',
        'object',
        'height',
        'modId',
        'scriptResult',
        'scriptError.prerequest',
        'scriptResult.prerequest',
        'scriptError'
      );
  });

  it('should accept both the default script parameters and a scripts array', () => {
    return expect(
      client.create(
        process.env.LAYOUT,
        {
          name: 'Han Solo',
          array: ['ben'],
          object: { 'co-pilot': 'chewbacca' },
          height: 52
        },
        {
          script: 'FMS Triggered Script',
          'script.param': 1,
          merge: true,
          scripts: [
            { name: 'FMS Triggered Script', phase: 'prerequest', param: 2 }
          ]
        }
      )
    )
      .to.eventually.be.a('object')
      .that.has.all.keys(
        'recordId',
        'name',
        'array',
        'object',
        'height',
        'modId',
        'scriptResult',
        'scriptError',
        'scriptError.prerequest',
        'scriptResult.prerequest'
      );
  });
});
