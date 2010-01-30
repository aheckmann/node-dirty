process.mixin(require('./common'));

var
  FILE = path.join(path.dirname(__filename), 'load.dirty'),

  TEST_ID = 'you-get-deleted',
  TEST_DOC = {makesMe: 'sad'},
  TEST_ID2 = 'you-stay',
  TEST_DOC2 = {makeMe: 'happy'},

  db1 = new Dirty(FILE),

  expectLoadedDocs = 1;

db1.set(TEST_ID, TEST_DOC);
db1.set(TEST_ID2, TEST_DOC2);
db1.remove(TEST_ID);
assert.deepEqual(TEST_DOC2, db1.get(TEST_ID2));

db1.addListener('flush', function() {
  var db2 = new Dirty(FILE);
  db2
    .load()
    .addCallback(function() {
      //posix.unlink(FILE);

      db2.filter(function(doc) {
        assert.ok(!doc._deleted);
        assert.deepEqual(TEST_DOC2, doc);
        assert.deepEqual(TEST_DOC2, db2.get(doc._id))
        expectLoadedDocs--;
      });
    });
});

process.addListener('exit', function() {
  assert.equal(0, expectLoadedDocs);
});

(function(){
// check that dup docs in file are not pushed into _docs array
var
  dupFILE = path.join(path.dirname(__filename), 'load.dirty-dupcheck'),
  TEST_ID3 = 'myId', 
  TEST_DOC3 = { "say": "hi" },
  TEST_DOC4 = { "say": "bye"},
  db3 = new Dirty(dupFILE),
  part2 = function() {
    db3.removeListener('flush', part2);
    db3
      .load()
      .addCallback(function() {
        db3.addListener('flush', part3);
      
        assert.equal(1, db3.filter(function(){ return true; }).length );       
        db3.set(TEST_ID3, TEST_DOC4);
        assert.equal(1, db3.filter(function(){ return true; }).length ); 
      
      });
  },
  part3 = function () {
    db3.removeListener('flush', part3);
    var db4 = new Dirty(dupFILE);
    // there are now multiple versions of TEST_ID in the file
    db4
      .load()
      .addCallback(function() {       
        assert.equal(1, db4.filter(function(){ return true; }).length );      
        posix.unlink(dupFILE);  
              
      })
  }
;

db3.addListener('flush', part2);
db3.set(TEST_ID3, TEST_DOC3);

})();