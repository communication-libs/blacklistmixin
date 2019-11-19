function createBlacklistUsageServiceMixin (execlib) {
  'use strict';

  var lib = execlib.lib,
    q = lib.q,
    qlib = lib.qlib,
    execSuite = execlib.execSuite,
    taskRegistry = execSuite.taskRegistry;

  var REASON_GENERAL = 1,
    REASON_INVALID = 2,
    REASON_NOT_TRUSTED = 3,
    REASON_COMPLAINED = 4;

  function BlacklistUsageServiceMixin (prophash) {
    execSuite.RemoteServiceListenerServiceMixin.checkForImplementation(this);
    this.blacklistAgeDays = lib.isNumber(prophash.blacklistagedays) ? prophash.blacklistagedays : null;
    this.findRemote(prophash.blacklistdbpath, null, 'Blacklist');
  }
  BlacklistUsageServiceMixin.prototype.destroy = function () {
    this.blacklistAgeDays = null;
  };

  BlacklistUsageServiceMixin.prototype.writeToCommunicationBlacklist = execSuite.dependentServiceMethod([], ['Blacklist'], function (blsink, blobj, defer) {
    qlib.promise2defer(blsink.call('create', blobj), defer);
  });

  BlacklistUsageServiceMixin.prototype.putToCommunicationBlacklist = execSuite.dependentServiceMethod([], ['Blacklist'], function (blsink, recipient, updateobj, options, defer) {
    qlib.promise2defer(blsink.call('update', {op: 'eq', field: 'recipient', value: recipient}, updateobj, options), defer);
  });

  BlacklistUsageServiceMixin.prototype.doBlacklistBecauseReason = function (recipient, sendingsystem, reason) {
    return this.putToCommunicationBlacklist(recipient, {recipient: recipient, sendingsystem: sendingsystem, created: Date.now(), reason: reason}, {op:'set', upsert:true}); 
  };

  BlacklistUsageServiceMixin.prototype.doBlacklist = function (recipient, sendingsystem) {
    return this.doBlacklistBecauseReason(recipient, sendingsystem, REASON_GENERAL);
  };

  BlacklistUsageServiceMixin.prototype.doBlacklistBecauseInvalid = function (recipient, sendingsystem) {
    return this.doBlacklistBecauseReason(recipient, sendingsystem, REASON_INVALID);
  };

  BlacklistUsageServiceMixin.prototype.doBlacklistBecauseNotTrusted = function (recipient, sendingsystem) {
    return this.doBlacklistBecauseReason(recipient, sendingsystem, REASON_NOT_TRUSTED);
  };

  BlacklistUsageServiceMixin.prototype.doBlacklistBecauseComplained = function (recipient, sendingsystem) {
    return this.doBlacklistBecauseReason(recipient, sendingsystem, REASON_COMPLAINED);
  };

  BlacklistUsageServiceMixin.prototype.readFromCommunicationBlacklist = execSuite.dependentServiceMethod([], ['Blacklist'], function (blsink, queryobj, defer) {
    taskRegistry.run('readFromDataSink', {
      sink: blsink,
      filter: queryobj.filter,
      visiblefields: queryobj.visiblefields,
      limit: queryobj.limit,
      offset: queryobj.offset,
      singleshot: queryobj.singleshot,
      cb: defer.resolve.bind(defer),
      errorcb: defer.reject.bind(defer)
    });
  });

  BlacklistUsageServiceMixin.prototype.checkBlacklistForRecipient = function (recipient) {
    var filter = {
      op: 'eq',
      field: 'recipient',
      value: recipient
    };
    if (lib.isNumber(this.blacklistAgeDays)) {
      filter = {
        op: 'and',
        filters: [filter,{
          op: 'gte',
          field: 'created',
          value: Date.now()-this.blacklistAgeDays*24*lib.intervals.Hour
        }]
      };
    }
    return q(null);
    return this.readFromCommunicationBlacklist({
      filter: filter,
      visiblefields: ['recipient'],
      singleshot: true
    }).then(
      qlib.resultpropertyreturner('recipient')
    );
  };

  BlacklistUsageServiceMixin.addMethods = function (klass) {
    lib.inheritMethods(klass, BlacklistUsageServiceMixin
      ,'writeToCommunicationBlacklist'
      ,'putToCommunicationBlacklist'
      ,'doBlacklistBecauseReason'
      ,'doBlacklist'
      ,'doBlacklistBecauseInvalid'
      ,'doBlacklistBecauseNotTrusted'
      ,'doBlacklistBecauseComplained'
      ,'readFromCommunicationBlacklist'
      ,'checkBlacklistForRecipient'
    );
  };

  return BlacklistUsageServiceMixin;
}
module.exports = createBlacklistUsageServiceMixin;
