import { collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): boolean {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Ignore benign errors during Vite HMR, tab visibility changes, or transient network offline states
  const benignErrors = ['Database is closing', 'hidden', 'unavailable', 'Could not reach', 'client is offline', 'offline', 'quota limit exceeded', 'resource-exhausted'];
  if (benignErrors.some(msg => errorMessage.toLowerCase().includes(msg.toLowerCase()))) {
    console.warn('Ignored quota/transient Firestore error:', errorMessage);
    return true; // Indicates it is benign
  }

  const errInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified
    },
    operationType, path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return false; // Indicates it is a real error
}
