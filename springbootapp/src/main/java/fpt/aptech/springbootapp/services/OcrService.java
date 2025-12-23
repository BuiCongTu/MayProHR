package fpt.aptech.springbootapp.services;

import java.io.File;
import java.io.IOException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import net.sourceforge.tess4j.ITesseract;
import net.sourceforge.tess4j.TesseractException;

@Service
public class OcrService {

    @Value("${ocr.tesseract.datapath:}")
    private String tesseractDatapath;

    @Value("${ocr.tesseract.language:vie+eng}")
    private String tesseractLanguage;

    @Value("${ocr.tesseract.enabled:false}")
    private boolean tesseractEnabled;

    public boolean isTesseractEnabled() {
        return tesseractEnabled;
    }

    public void assertTesseractReady() {
        if (!tesseractEnabled) {
            throw new IllegalStateException("Tesseract OCR is disabled (ocr.tesseract.enabled=false)");
        }

        configureNativeTesseractLibraryPathIfNeeded();

        if (tesseractDatapath == null || tesseractDatapath.isBlank()) {
            throw new IllegalStateException(
                    "Missing config: ocr.tesseract.datapath. "
                    + "This must point to a directory that contains a 'tessdata' folder (e.g. /opt/tesseract or C:\\\\tesseract)."
            );
        }

        File datapathDir = new File(tesseractDatapath);
        if (!datapathDir.exists() || !datapathDir.isDirectory()) {
            throw new IllegalStateException(
                    "Invalid ocr.tesseract.datapath='" + tesseractDatapath + "': directory does not exist or is not a directory."
            );
        }

        File tessdataDir = new File(datapathDir, "tessdata");
        if (!tessdataDir.exists() || !tessdataDir.isDirectory()) {
            throw new IllegalStateException(
                    "Invalid ocr.tesseract.datapath='" + tesseractDatapath + "': missing tessdata directory at: " + tessdataDir.getAbsolutePath()
            );
        }

        String lang = (tesseractLanguage == null || tesseractLanguage.isBlank()) ? "eng" : tesseractLanguage.trim();
        for (String code : lang.split("\\+")) {
            String c = code.trim();
            if (c.isEmpty()) {
                continue;
            }

            File trainedData = new File(tessdataDir, c + ".traineddata");
            if (!trainedData.exists() || !trainedData.isFile()) {
                throw new IllegalStateException(
                        "Missing traineddata: " + trainedData.getAbsolutePath()
                        + " (language='" + lang + "'). "
                        + "Either provide this file or change ocr.tesseract.language."
                );
            }
        }
    }

    public String extractText(MultipartFile file) {
        assertTesseractReady();

        File tempFile = null;
        try {
            String originalName = file.getOriginalFilename();
            String ext = ".img";
            if (originalName != null) {
                String lower = originalName.toLowerCase();
                if (lower.endsWith(".png")) {
                    ext = ".png"; 
                }else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
                    ext = ".jpg"; 
                }else if (lower.endsWith(".webp")) {
                    ext = ".webp"; 
                }else if (lower.endsWith(".tif") || lower.endsWith(".tiff")) {
                    ext = ".tif";
                }
            }

            tempFile = File.createTempFile("ocr-", ext);
            file.transferTo(tempFile);

            ITesseract tesseract = createTesseractSafely();
            // Fix: Append "tessdata" because native Tesseract expects the directory containing .traineddata files
            // while our config points to the parent directory (standard structure).
            File tessDataDir = new File(tesseractDatapath, "tessdata");
            tesseract.setDatapath(tessDataDir.getAbsolutePath());
            tesseract.setLanguage(tesseractLanguage);

            return tesseract.doOCR(tempFile);
        } catch (UnsatisfiedLinkError e) {
            throw new IllegalStateException(
                    "Cannot load native Tesseract library (libtesseract). "
                    + "For offline OCR, your runtime must include native Tesseract binaries compatible with your OS/CPU/JVM. "
                    + "Root: " + e.getMessage(), e
            );
        } catch (IOException | TesseractException e) {
            throw new IllegalStateException("Tesseract OCR failed: " + e.getMessage(), e);
        } finally {
            if (tempFile != null && tempFile.exists()) {
                // best-effort cleanup
                tempFile.delete();
            }
        }
    }

    private ITesseract createTesseractSafely() {
        try {
            Class<?> clazz = Class.forName("net.sourceforge.tess4j.Tesseract");
            return (ITesseract) clazz.getDeclaredConstructor().newInstance();
        } catch (UnsatisfiedLinkError e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Cannot initialize Tess4J Tesseract instance: " + e.getMessage(), e);
        }
    }

    private void configureNativeTesseractLibraryPathIfNeeded() {
        String existing = System.getProperty("jna.library.path");
        if (existing != null && !existing.isBlank()) {
            return;
        }

        String os = System.getProperty("os.name", "");
        if (!os.toLowerCase().contains("mac")) {
            return;
        }

        // Common Homebrew locations (Apple Silicon + Intel)
        String[] candidates = new String[]{
            "/opt/homebrew/lib",
            "/opt/homebrew/opt/tesseract/lib",
            "/usr/local/lib",
            "/usr/local/opt/tesseract/lib"
        };

        StringBuilder detected = new StringBuilder();
        for (String dir : candidates) {
            File libDir = new File(dir);
            if (!libDir.isDirectory()) {
                continue;
            }

            // Tesseract dylib names vary across versions
            boolean hasLib
                    = new File(libDir, "libtesseract.dylib").exists()
                    || new File(libDir, "libtesseract.5.dylib").exists()
                    || new File(libDir, "libtesseract.6.dylib").exists();

            if (hasLib) {
                if (detected.length() > 0) {
                    detected.append(":");
                }
                detected.append(dir);
            }
        }

        if (detected.length() > 0) {
            System.setProperty("jna.library.path", detected.toString());
        }
    }
}
