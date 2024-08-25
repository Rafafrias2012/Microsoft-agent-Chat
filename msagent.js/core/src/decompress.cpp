
// Integer types from WASI-libc
using usize = unsigned int;
using u32 = unsigned int;
using u8 = unsigned char;

#define LOWORD(x) (x & 0xffff)
#define LOBYTE(x) (x & 0xff)

#define PUBLIC __attribute__((visibility("default"))) extern "C"

PUBLIC usize agentDecompressWASM(const void* pSrcData, usize pSrcSize, void* pTrgData, usize pTrgSize) {
	const u8* lSrcPtr = (const u8*)pSrcData;
	const u8* lSrcEnd = lSrcPtr + pSrcSize;
	u8* lTrgPtr = (u8*)pTrgData;
	u8* lTrgEnd = lTrgPtr + pTrgSize;
	u32 lSrcQuad;
	u8 lTrgByte;
	u32 lBitCount = 0;
	u32 lSrcOffset;
	u32 lRunLgth;
	u32 lRunCount;

	if((pSrcSize <= 7) || (*lSrcPtr != 0)) {
		return 0;
	}

	for(lBitCount = 1; (*(lSrcEnd - lBitCount) == 0xFF); lBitCount++) {
		if(lBitCount > 6) {
			break;
		}
	}
	if(lBitCount < 6) {
		return 0;
	}

	lBitCount = 0;
	lSrcPtr += 5;

	while((lSrcPtr < lSrcEnd) && (lTrgPtr < lTrgEnd)) {
		lSrcQuad = *(const u32*)(lSrcPtr - sizeof(u32));

		if(lSrcQuad & (1 << LOWORD(lBitCount))) {
			lSrcOffset = 1;

			if(lSrcQuad & (1 << LOWORD(lBitCount + 1))) {
				if(lSrcQuad & (1 << LOWORD(lBitCount + 2))) {
					if(lSrcQuad & (1 << LOWORD(lBitCount + 3))) {
						lSrcQuad >>= LOWORD(lBitCount + 4);
						lSrcQuad &= 0x000FFFFF;
						if(lSrcQuad == 0x000FFFFF) {
							break;
						}
						lSrcQuad += 4673;
						lBitCount += 24;

						lSrcOffset = 2;
					} else {
						lSrcQuad >>= LOWORD(lBitCount + 4);
						lSrcQuad &= 0x00000FFF;
						lSrcQuad += 577;
						lBitCount += 16;
					}
				} else {
					lSrcQuad >>= LOWORD(lBitCount + 3);
					lSrcQuad &= 0x000001FF;
					lSrcQuad += 65;
					lBitCount += 12;
				}
			} else {
				lSrcQuad >>= LOWORD(lBitCount + 2);
				lSrcQuad &= 0x0000003F;
				lSrcQuad += 1;
				lBitCount += 8;
			}

			lSrcPtr += (lBitCount / 8);
			lBitCount &= 7;
			lRunLgth = *(const u32*)(lSrcPtr - sizeof(u32));
			lRunCount = 0;
			while(lRunLgth & (1 << LOWORD(lBitCount + lRunCount))) {
				lRunCount++;
				if(lRunCount > 11) {
					break;
				}
			}

			lRunLgth >>= LOWORD(lBitCount + lRunCount + 1);
			lRunLgth &= (1 << lRunCount) - 1;
			lRunLgth += 1 << lRunCount;
			lRunLgth += lSrcOffset;
			lBitCount += lRunCount * 2 + 1;

			if(lTrgPtr + lRunLgth > lTrgEnd) {
				break;
			}
			if(lTrgPtr - lSrcQuad < pTrgData) {
				break;
			}
			while((long)lRunLgth > 0) {
				lTrgByte = *(lTrgPtr - lSrcQuad);
				*(lTrgPtr++) = lTrgByte;
				lRunLgth--;
			}
		} else {
			lSrcQuad >>= LOWORD(lBitCount + 1);
			lBitCount += 9;

			lTrgByte = LOBYTE(lSrcQuad);
			*(lTrgPtr++) = lTrgByte;
		}

		lSrcPtr += lBitCount / 8;
		lBitCount &= 7;
	}

	return (usize)(lTrgPtr - (u8*)pTrgData);
}
