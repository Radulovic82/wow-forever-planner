import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
  getFirestore,
  collection,
  onSnapshot,
  getDocsFromServer,
  doc,
  setDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { firebaseConfig } from './config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const decisionsRef = collection(db, 'decisions');

export function watchAuth(cb) {
  return onAuthStateChanged(auth, (user) => cb(user ? { uid: user.uid } : null));
}

export async function signInWithGoogle() {
  await signInWithPopup(auth, new GoogleAuthProvider());
}

export function signOutUser() {
  return signOut(auth);
}

function fromDoc(snapshot) {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    title: data.title ?? '',
    phase: data.phase ?? '',
    topic: data.topic ?? '',
    order: data.order ?? 0,
    deadline: data.deadline ? data.deadline.toDate().toISOString() : null,
    kind: data.kind ?? 'choice',
    maxPicks: data.maxPicks ?? 1,
    options: data.options ?? [],
    status: data.status ?? 'open',
    chosen: data.chosen ?? [],
    answer: data.answer ?? '',
    reason: data.reason ?? '',
  };
}

export function subscribeDecisions(onData, onError) {
  return onSnapshot(decisionsRef, (snap) => onData(snap.docs.map(fromDoc), { fromCache: snap.metadata.fromCache }), onError);
}

export async function saveOwnerState(id, state) {
  await setDoc(
    doc(db, 'decisions', id),
    {
      status: state.status,
      chosen: state.chosen,
      answer: state.answer,
      reason: state.reason,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

// Always asks the server, never the local cache, so an import cannot mistake an empty cache for an empty collection.
export async function readExistingDecisions() {
  const snap = await getDocsFromServer(decisionsRef);
  return new Map(snap.docs.map((d) => [d.id, fromDoc(d)]));
}

export async function commitImport(writes) {
  const batch = writeBatch(db);
  for (const { id, create, data } of writes) {
    const payload = {
      ...data,
      deadline: data.deadline ? Timestamp.fromDate(new Date(data.deadline)) : null,
      updatedAt: serverTimestamp(),
    };
    batch.set(doc(db, 'decisions', id), payload, { merge: !create });
  }
  await batch.commit();
}
