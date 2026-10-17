const DB_NAME='verifyscholar-local';
let connection;
async function db(){
  if(connection)return connection;
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>request.result.createObjectStore('documents',{keyPath:'id'});
    request.onsuccess=()=>{connection=request.result;resolve(connection);};
    request.onerror=()=>reject(request.error);
  });
}
async function transact(mode,action){
  const database=await db();
  return new Promise((resolve,reject)=>{
    const transaction=database.transaction('documents',mode),request=action(transaction.objectStore('documents'));
    transaction.oncomplete=()=>resolve(request.result);
    transaction.onerror=()=>reject(transaction.error);
    transaction.onabort=()=>reject(transaction.error||Error('Storage operation aborted.'));
  });
}
export const history={list:()=>transact('readonly',s=>s.getAll()),save:document=>transact('readwrite',s=>s.put(document)),remove:id=>transact('readwrite',s=>s.delete(id)),clear:()=>transact('readwrite',s=>s.clear())};
