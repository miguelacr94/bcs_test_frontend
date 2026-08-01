import * as React from "react"
import { toast as toastManager } from "@/components/ui/toast"

export type ToastProps = {
  title?: React.ReactNode
  description?: React.ReactNode
  variant?: "default" | "destructive"
  type?: "success" | "info" | "warning" | "error" | "loading"
}

export function useToast() {
  return {
    toast: (props: ToastProps) => {
      const type = props.type || (props.variant === "destructive" ? "error" : "info")
      return toastManager.add({ 
        title: props.title, 
        description: props.description,
        type: type 
      } as any)
    },
    dismiss: (id?: string) => toastManager.close(id),
  }
}

export const toast = (props: ToastProps) => {
  const type = props.type || (props.variant === "destructive" ? "error" : "info")
  return toastManager.add({ 
    title: props.title, 
    description: props.description,
    type: type 
  } as any)
}
