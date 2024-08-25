# Makefile for WASM decompression.

CXX = clang++ --target=wasm32
CXXFLAGS = -Wall \
		-Os \
		-nostdlib \
		-fvisibility=hidden \
		-std=c++20 \
		-ffunction-sections \
		-fdata-sections

src/decompress.wasm: obj/ obj/decompress.o
	wasm-ld \
		-o $@ \
		--no-entry \
		--strip-all \
		--export-dynamic \
		--allow-undefined \
		--initial-memory=131072 \
		--error-limit=0 \
		--lto-O3 \
		-O3 \
		--gc-sections \
		obj/decompress.o


obj/%.o: src/%.cpp
	$(CXX) -c $(CXXFLAGS) $< -o $@

clean:
	rm -rf obj src/decompress.wasm

obj/:
	mkdir -p obj/
