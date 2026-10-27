// CSS module declarations — устраняет Pylance warning

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}