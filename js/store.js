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
  doc,
  setDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { firebaseConfig } from './config.js';
import { mergeDecision } from './catalog.js';

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
  return onSnapshot(decisionsRef, (snap) => onData(snap.docs.map(fromDoc)), onError);
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

export async function importDecisions(decisions, existingById) {
  const batch = writeBatch(db);
  const tally = { created: 0, updated: 0, revisit: 0 };
  for (const incoming of decisions) {
    const { create, data } = mergeDecision(existingById.get(incoming.id) ?? null, incoming);
    const payload = {
      ...data,
      deadline: data.deadline ? Timestamp.fromDate(new Date(data.deadline)) : null,
      updatedAt: serverTimestamp(),
    };
    batch.set(doc(db, 'decisions', incoming.id), payload, { merge: !create });
    if (create) tally.created += 1;
    else tally.updated += 1;
    if (data.status === 'revisit') tally.revisit += 1;
  }
  await batch.commit();
  return tally;
}
