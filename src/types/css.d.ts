// CSS module declarations — устраняет Pylance warning
// "Cannot find module './index.css' or its corresponding type declarations"
declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}