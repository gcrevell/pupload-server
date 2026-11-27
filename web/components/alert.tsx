export function Alert({ message }: { message: string | null }) {
  return <p class="alert alert--error" role="alert" hidden={message === null}>{message}</p>
}
