# Structs

This contains all the structures we read.

# How to use

Simple. Given a bufferstream that has been already set up, to read a structure, you just do 

```typescript
let obj = TYPE.read(buffer);
```

and this will get you a instance of the read type. Easy as that!
