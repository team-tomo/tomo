import { useMutation } from "@tanstack/react-query"

import {
  signInWithEmail,
  signOut,
  signUpWithEmail,
} from "@/services/auth-service"

export function useSignIn() {
  return useMutation({
    mutationFn: signInWithEmail,
  })
}

export function useSignUp() {
  return useMutation({
    mutationFn: signUpWithEmail,
  })
}

// export function useResetPassword() {
//   return useMutation({
//     mutationFn: resetPassword,
//   })
// }

// export function useChangePassword() {
//   return useMutation({
//     mutationFn: changePassword,
//   })
// }

export function useSignOut() {
  return useMutation({
    mutationFn: signOut,
  })
}
