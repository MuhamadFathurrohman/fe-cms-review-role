/**
 * @file ItemsForm.jsx
 * @description Komponen form modal untuk manajemen data produk/item dengan dukungan multi-bahasa.
 * Mendukung dua mode operasi:
 * - **Create**: Membuat produk baru dengan konten bilingual
 * - **Edit**: Mengedit produk yang sudah ada
 * 
 * Menyediakan fitur lengkap:
 * - Dukungan terjemahan bilingual (English wajib, Indonesian opsional)
 * - Upload multiple gambar dengan preview dan urutan primary
 * - Seleksi kategori dan brand dari dropdown dinamis
 * - Editor rich text (Tiptap) untuk deskripsi panjang
 * - Manajemen spesifikasi (key-value pairs) dan fitur (tags)
 * - Pengaturan SEO bilingual
 * - Status aktif/featured dan sort order
 * - Validasi input bilingual yang ketat
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Globe,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  X,
  Upload,
  Trash2,
} from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import { itemService } from "../../../services/itemService";
import { categoriesService } from "../../../services/categoriesService";
import { brandService } from "../../../services/brandService";
import { uploadService } from "../../../services/uploadService";
import { useModalContext } from "../../../contexts/ModalContext";
import AlertModal from "../../Alerts/AlertModal";
import PulseDots from "../../Loaders/PulseDots";
import TiptapEditor from "../../TiptapEditor";
import "../../../sass/components/Modals/ItemsForm/ItemsForm.scss";

/**
 * Komponen custom select dropdown dengan dukungan loading dan disabled state.
 * Digunakan untuk seleksi kategori dan brand.
 * 
 * @component
 * @param {Object} props - Props komponen
 * @param {string} props.label - Label untuk dropdown
 * @param {string} props.value - Nilai yang dipilih saat ini
 * @param {function(string): void} props.onChange - Handler saat nilai berubah
 * @param {Array<{value: string, label: string}>} props.options - Opsi yang tersedia
 * @param {string} props.placeholder - Placeholder saat tidak ada pilihan
 * @param {boolean} [props.required=false] - Apakah field wajib diisi
 * @param {boolean} [props.disabled=false] - Apakah dropdown dinonaktifkan
 * @param {boolean} [props.loading=false] - Status loading dropdown
 */
const CustomSelect = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  required = false,
  disabled = false,
  loading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const toggleDropdown = () => {
    if (!disabled && !loading) {
      setIsOpen(!isOpen);
    }
  };

  const handleOptionClick = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const getDisplayValue = () => {
    if (loading) return "Loading...";
    if (disabled) return placeholder;

    const selectedOption = options.find((opt) => opt.value === value);
    return selectedOption ? selectedOption.label : placeholder;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="custom-select-container" ref={dropdownRef}>
      <label>
        {label} {required && "*"}
      </label>
      <div
        className={`custom-select ${disabled || loading ? "disabled" : ""} ${
          isOpen ? "open" : ""
        }`}
        onClick={toggleDropdown}
      >
        <span className="custom-select-value">{getDisplayValue()}</span>
        <div className="custom-select-arrow">
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {isOpen && !loading && (
        <div className="custom-select-dropdown">
          <div className="custom-select-scroll">
            {options.length > 0 ? (
              options.map((option) => (
                <div
                  key={option.value}
                  className="custom-select-option"
                  onClick={() => handleOptionClick(option.value)}
                >
                  {option.label}
                </div>
              ))
            ) : (
              <div className="custom-select-option disabled">
                No options available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Props untuk komponen ItemsForm.
 * @typedef {Object} ItemsFormProps
 * @property {Object|null} [item=null] - Data produk awal untuk mode edit
 * @property {function(): void} onClose - Callback saat form ditutup
 * @property {function(): void} onSuccess - Callback saat operasi berhasil
 */

/**
 * Komponen form modal untuk manajemen data produk bilingual.
 * Digunakan dalam konteks modal untuk operasi CRUD produk.
 *
 * @component
 * @param {ItemsFormProps} props - Props komponen
 */
const ItemsForm = ({ item = null, onClose, onSuccess }) => {
  const { user: currentUser } = useAuth();
  const { openModal, closeModal } = useModalContext();

  /** @type {boolean} Status apakah ini mode edit */
  const isEditing = !!item;

  /**
   * Bahasa yang sedang aktif untuk pengisian form.
   * @type {['EN'|'ID', React.Dispatch<React.SetStateAction<'EN'|'ID'>>]}
   */
  const [currentLanguage, setCurrentLanguage] = useState("EN");

  /**
   * Data terjemahan untuk kedua bahasa.
   * @type {{
   *   EN: { shortDescription: string, longDescription: string, specifications: Object, features: string[], metaTitle: string, metaDescription: string, metaKeywords: string },
   *   ID: { shortDescription: string, longDescription: string, specifications: Object, features: string[], metaTitle: string, metaDescription: string, metaKeywords: string }
   * }}
   */
  const [translations, setTranslations] = useState({
    EN: {
      shortDescription: "",
      longDescription: "",
      specifications: {},
      features: [],
      metaTitle: "",
      metaDescription: "",
      metaKeywords: "",
    },
    ID: {
      shortDescription: "",
      longDescription: "",
      specifications: {},
      features: [],
      metaTitle: "",
      metaDescription: "",
      metaKeywords: "",
    },
  });

  /**
   * Data master produk (non-terjemahan).
   * @type {{
   *   name: string,
   *   categoryId: string,
   *   brandId: string,
   *   images: string,
   *   isActive: boolean,
   *   isFeatured: boolean,
   *   sortOrder: number
   * }}
   */
  const [masterData, setMasterData] = useState({
    name: "",
    categoryId: "",
    brandId: "",
    images: "",
    isActive: true,
    isFeatured: false,
    sortOrder: 0,
  });

  
  /**
   * State gambar produk (multiple).
   * Struktur: Array of { id: string, file: File|null, preview: string, isExisting: boolean }
   * @type {Array<{ id: string, file: File|null, preview: string, isExisting: boolean }>}
   */
  const [images, setImages] = useState([]);

  /**
   * Pesan error validasi untuk upload gambar.
   * @type {[string, React.Dispatch<React.SetStateAction<string>>]}
   */
  const [imageError, setImageError] = useState("");

  /**
   * Input teks sementara untuk penambahan fitur.
   * @type {[string, React.Dispatch<React.SetStateAction<string>>]}
   */
  const [featureInput, setFeatureInput] = useState("");

  /**
   * Input kunci sementara untuk penambahan spesifikasi.
   * @type {[string, React.Dispatch<React.SetStateAction<string>>]}
   */
  const [specKey, setSpecKey] = useState("");

  /**
   * Input nilai sementara untuk penambahan spesifikasi.
   * @type {[string, React.Dispatch<React.SetStateAction<string>>]}
   */
  const [specValue, setSpecValue] = useState("");

  /**
   * Pesan error validasi untuk spesifikasi.
   * @type {[string, React.Dispatch<React.SetStateAction<string>>]}
   */
  const [specError, setSpecError] = useState("");

  /**
   * Status loading saat proses submit berlangsung.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [loading, setLoading] = useState(false);

  /**
   * Pesan error umum untuk form.
   * @type {[string, React.Dispatch<React.SetStateAction<string>>]}
   */
  const [error, setError] = useState("");

  /**
   * Pesan error validasi per field.
   * @type {{[fieldName: string]: string}}
   */
  const [validationErrors, setValidationErrors] = useState({});

  /**
   * Daftar kategori yang tersedia untuk seleksi.
   * @type {Array<Object>}
   */
  const [categories, setCategories] = useState([]);

  /**
   * Daftar brand yang tersedia untuk seleksi.
   * @type {Array<Object>}
   */
  const [brands, setBrands] = useState([]);

  /**
   * Status loading saat mengambil data kategori.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  /**
   * Status loading saat mengambil data brand.
   * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
   */
  const [brandsLoading, setBrandsLoading] = useState(false);

  // Load kategori dan brand saat komponen dipasang
  useEffect(() => {
    const loadOptions = async () => {
      try {
        setCategoriesLoading(true);
        const categoryResult = await categoriesService.getAll();
        if (categoryResult.success && Array.isArray(categoryResult.data)) {
          setCategories(categoryResult.data);
          if (categoryResult.data.length > 0 && !masterData.categoryId) {
            setMasterData((prev) => ({
              ...prev,
              categoryId: categoryResult.data[0].id,
            }));
          }
        } else {
          setCategories([]);
        }
        setCategoriesLoading(false);

        setBrandsLoading(true);
        const brandResult = await brandService.getAll();
        if (brandResult.success && Array.isArray(brandResult.data)) {
          const productBrands = brandResult.data.filter(
            (brand) => brand.type === "PRODUCT"
          );
          setBrands(productBrands);
          if (productBrands.length > 0 && !masterData.brandId) {
            setMasterData((prev) => ({
              ...prev,
              brandId: productBrands[0].id,
            }));
          }
        } else {
          setBrands([]);
        }
        setBrandsLoading(false);
      } catch (err) {
        console.error("Error loading options:", err);
        setCategoriesLoading(false);
        setBrandsLoading(false);
        setCategories([]);
        setBrands([]);
      }
    };

    loadOptions();
  }, []);

  // Load data pada mode edit
  useEffect(() => {
    if (isEditing && item) {
      setMasterData({
        name: item.name || "",
        categoryId: item.categoryId || "",
        brandId: item.brandId || "",
        isActive: item.isActive ?? true,
        isFeatured: item.isFeatured ?? false,
        sortOrder: item.sortOrder ?? 0,
      });

      // IMAGES
      if (Array.isArray(item.images)) {
        const existingImages = item.images.map((url, index) => ({
          id: `existing-${index}`,
          file: null,
          preview: url,
          isExisting: true,
        }));
        setImages(existingImages);
      }

      // --- FIX BESAR DI SINI ---
      const enTrans = item.translations?.find((t) => t.language === "EN") || {};

      const idTrans = item.translations?.find((t) => t.language === "ID") || {};

      const enData = {
        shortDescription:
          item.shortDescription ?? enTrans.shortDescription ?? "",
        longDescription: item.longDescription ?? enTrans.longDescription ?? "",
        specifications: item.specifications ?? enTrans.specifications ?? {},
        features: item.features ?? enTrans.features ?? [],
        metaTitle: item.metaTitle ?? enTrans.metaTitle ?? "",
        metaDescription: item.metaDescription ?? enTrans.metaDescription ?? "",
        metaKeywords: item.metaKeywords ?? enTrans.metaKeywords ?? "",
      };

      const idData = {
        shortDescription:
          item.shortDescriptionId ?? idTrans.shortDescription ?? "",
        longDescription:
          item.longDescriptionId ?? idTrans.longDescription ?? "",
        specifications: item.specificationsId ?? idTrans.specifications ?? {},
        features: item.featuresId ?? idTrans.features ?? [],
        metaTitle: item.metaTitleId ?? idTrans.metaTitle ?? "",
        metaDescription:
          item.metaDescriptionId ?? idTrans.metaDescription ?? "",
        metaKeywords: item.metaKeywordsId ?? idTrans.metaKeywords ?? "",
      };

      setTranslations({ EN: enData, ID: idData });

      setValidationErrors({});
      setError("");
      setImageError("");
    }
  }, [item, isEditing, categories, brands]);

  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      images.forEach((img) => {
        if (img.preview && img.preview.startsWith("blob:")) {
          URL.revokeObjectURL(img.preview);
        }
      });
    };
  }, [images]);

  /**
   * Memvalidasi form sebelum submit.
   * Menerapkan aturan bilingual yang ketat:
   * - English selalu wajib (deskripsi pendek dan panjang)
   * - Indonesian opsional tapi harus lengkap jika disediakan
   * - Gambar minimal 1 buah
   * - Kategori dan brand wajib diisi
   * 
   * @returns {boolean} `true` jika valid, `false` jika tidak
   */
  const validateForm = () => {
    const errors = {};

    if (!masterData.name?.trim()) {
      errors.name = "Item name is required";
    }
    if (!masterData.categoryId) {
      errors.categoryId = "Category is required";
    }
    if (!masterData.brandId) {
      errors.brandId = "Brand is required";
    }

    if (images.length === 0) {
      errors.images = "At least one image is required";
    }

    // English Translation - REQUIRED
    const en = translations.EN;
    if (!en.shortDescription?.trim()) {
      errors["EN.shortDescription"] = "English short description is required";
    }
    if (!en.longDescription?.trim()) {
      errors["EN.longDescription"] = "English long description is required";
    }

    // Indonesian Translation - OPTIONAL but must be COMPLETE
    const id = translations.ID;
    const hasIdShort = id.shortDescription?.trim();
    const hasIdLong = id.longDescription?.trim();

    // If user fills one field, must fill both
    if (hasIdShort && !hasIdLong) {
      errors["ID.longDescription"] =
        "Indonesian long description is required when short description is provided";
    }

    if (hasIdLong && !hasIdShort) {
      errors["ID.shortDescription"] =
        "Indonesian short description is required when long description is provided";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Handler perubahan bahasa aktif.
   * @param {'EN'|'ID'} lang - Bahasa yang dipilih
   */
  const handleLanguageChange = (lang) => {
    setCurrentLanguage(lang);
    setFeatureInput("");
    setSpecKey("");
    setSpecValue("");
  };

  /**
   * Handler perubahan field terjemahan.
   * @param {string} field - Nama field yang diubah
   * @param {string} value - Nilai baru
   */
  const handleTranslationChange = (field, value) => {
    setTranslations((prev) => ({
      ...prev,
      [currentLanguage]: {
        ...prev[currentLanguage],
        [field]: value,
      },
    }));
    setValidationErrors((prev) => {
      const key = `${currentLanguage}.${field}`;
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  };

  /**
   * Handler perubahan field master data.
   * @param {string} field - Nama field yang diubah
   * @param {string|boolean|number} value - Nilai baru
   */
  const handleMasterChange = (field, value) => {
    setMasterData((prev) => ({ ...prev, [field]: value }));
    setValidationErrors((prev) => {
      const { [field]: _, ...rest } = prev;
      return rest;
    });
    if (error) setError("");
  };

  // Handle multiple image uploads
  /**
   * Handler penambahan multiple gambar.
   * Melakukan validasi file sebelum memproses preview.
   * @param {React.ChangeEvent<HTMLInputElement>} e - Event input file
   */
  const handleImageAdd = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Validate each file
    for (const file of files) {
      const validation = uploadService.validateFile(file);
      if (!validation.isValid) {
        setImageError(validation.error);
        return;
      }
    }

    setImageError("");

    // Add new images to existing array
    const newImages = files.map((file, index) => ({
      id: `new-${Date.now()}-${index}`,
      file: file,
      preview: URL.createObjectURL(file),
      isExisting: false,
    }));

    setImages((prev) => [...prev, ...newImages]);
    setValidationErrors((prev) => {
      const { images, ...rest } = prev;
      return rest;
    });

    // Reset input
    e.target.value = "";
  };

  // Remove image
  /**
   * Handler penghapusan gambar tertentu dari form.
   * Membersihkan state dan URL object.
   * @param {string} imageId - ID gambar yang akan dihapus
   */
  const handleImageRemove = (imageId) => {
    setImages((prev) => {
      const imageToRemove = prev.find((img) => img.id === imageId);

      // Revoke blob URL if it's a new upload
      if (imageToRemove && imageToRemove.preview.startsWith("blob:")) {
        URL.revokeObjectURL(imageToRemove.preview);
      }

      return prev.filter((img) => img.id !== imageId);
    });

    setImageError("");
  };

  /**
   * Handler penambahan fitur dari input teks.
   */
  const handleAddFeature = () => {
    if (
      featureInput.trim() &&
      !translations[currentLanguage].features.includes(featureInput.trim())
    ) {
      setTranslations((prev) => ({
        ...prev,
        [currentLanguage]: {
          ...prev[currentLanguage],
          features: [...prev[currentLanguage].features, featureInput.trim()],
        },
      }));
      setFeatureInput("");
    }
  };

  /**
   * Handler penghapusan fitur tertentu.
   * @param {string} featureToRemove - Fitur yang akan dihapus
   */
  const handleRemoveFeature = (featureToRemove) => {
    setTranslations((prev) => ({
      ...prev,
      [currentLanguage]: {
        ...prev[currentLanguage],
        features: prev[currentLanguage].features.filter(
          (feature) => feature !== featureToRemove
        ),
      },
    }));
  };

  /**
   * Handler penambahan spesifikasi (key-value pair).
   */
  const handleAddSpecification = () => {
    // Validasi: harus mengisi keduanya
    if (specKey.trim() && !specValue.trim()) {
      setSpecError("Please fill in the specification value");
      return;
    }

    if (!specKey.trim() && specValue.trim()) {
      setSpecError("Please fill in the specification key");
      return;
    }

    if (specKey.trim() && specValue.trim()) {
      const newSpecs = {
        ...translations[currentLanguage].specifications,
        [specKey.trim()]: specValue.trim(),
      };
      setTranslations((prev) => ({
        ...prev,
        [currentLanguage]: {
          ...prev[currentLanguage],
          specifications: newSpecs,
        },
      }));
      setSpecKey("");
      setSpecValue("");
      setSpecError(""); // Clear error jika berhasil
    }
  };

  /**
   * Handler perubahan input kunci spesifikasi.
   * @param {React.ChangeEvent<HTMLInputElement>} e - Event input
   */
  const handleSpecKeyChange = (e) => {
    setSpecKey(e.target.value);
    if (specError) setSpecError(""); // Clear error saat user mulai mengisi
  };

  /**
   * Handler perubahan input nilai spesifikasi.
   * @param {React.ChangeEvent<HTMLInputElement>} e - Event input
   */
  const handleSpecValueChange = (e) => {
    setSpecValue(e.target.value);
    if (specError) setSpecError(""); // Clear error saat user mulai mengisi
  };

  /**
   * Handler penghapusan spesifikasi tertentu.
   * @param {string} keyToRemove - Kunci spesifikasi yang akan dihapus
   */
  const handleRemoveSpecification = (keyToRemove) => {
    const newSpecs = { ...translations[currentLanguage].specifications };
    delete newSpecs[keyToRemove];
    setTranslations((prev) => ({
      ...prev,
      [currentLanguage]: {
        ...prev[currentLanguage],
        specifications: newSpecs,
      },
    }));
  };

  /**
   * Handler perubahan status aktif/non-aktif.
   * @param {boolean} status - Status baru
   */
  const handleStatusChange = (status) => {
    setMasterData((prev) => ({ ...prev, isActive: status }));
  };

  /**
   * Handler perubahan status featured.
   * @param {boolean} featured - Status featured baru
   */
  const handleFeaturedChange = (featured) => {
    setMasterData((prev) => ({ ...prev, isFeatured: featured }));
  };

  /**
   * Handler submit form utama.
   * Mengelola logika bisnis untuk create/update produk dengan validasi bilingual.
   * @param {React.FormEvent<HTMLFormElement>} e - Event submit
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setImageError("");

    if (!currentUser || !currentUser.id) {
      openModal(
        "authError",
        <AlertModal
          type="error"
          title="Authentication Error"
          message="User session expired. Please log in again."
          showActions={true}
          confirmText="OK"
          onConfirm={() => closeModal("authError")}
        />,
        "small"
      );
      setLoading(false);
      return;
    }

    try {
      if (!validateForm()) {
        setError("Please complete all required fields.");
        setLoading(false);
        return;
      }

      if (images.length === 0) {
        setError("Please upload at least one image.");
        setLoading(false);
        return;
      }

      const productData = {
        name: masterData.name,
        categoryId: masterData.categoryId,
        brandId: masterData.brandId,
        isActive: masterData.isActive,
        isFeatured: masterData.isFeatured,
        sortOrder: masterData.sortOrder,
        images: images, // Pass raw images array
        translations: [],
      };

      /* ---------------------------------------------
      FINAL FIX → Build translations
      --------------------------------------------- */
      // EN always required
      productData.translations.push({
        language: "EN",
        shortDescription: translations.EN.shortDescription || "",
        longDescription: translations.EN.longDescription || "",
        specifications: translations.EN.specifications || {},
        features: translations.EN.features || [],
        metaTitle: translations.EN.metaTitle || "",
        metaDescription: translations.EN.metaDescription || "",
        metaKeywords: translations.EN.metaKeywords || "",
      });

      // ID optional but must be complete
      const idShort = translations.ID.shortDescription?.trim();
      const idLong = translations.ID.longDescription?.trim();

      if (idShort && idLong) {
        productData.translations.push({
          language: "ID",
          shortDescription: idShort,
          longDescription: idLong,
          specifications: translations.ID.specifications || {},
          features: translations.ID.features || [],
          metaTitle: translations.ID.metaTitle || "",
          metaDescription: translations.ID.metaDescription || "",
          metaKeywords: translations.ID.metaKeywords || "",
        });
      }

      console.log("📤 Submitting product:", {
        isEditing,
        totalImages: images.length,
        newImages: images.filter((img) => !img.isExisting).length,
        existingImages: images.filter((img) => img.isExisting).length,
      });
      let result;
      if (isEditing) {
        result = await itemService.update(item.id, productData);
      } else {
        result = await itemService.create(productData, currentUser.id);
      }

      /* --------------------------------------------- */

      if (result.success) {
        const modalId = isEditing ? `editItem-${item.id}` : "addItem";
        closeModal(modalId);

        setTimeout(() => {
          openModal(
            "itemSaveSuccess",
            <AlertModal
              type="success"
              title={isEditing ? "Updated!" : "Created!"}
              message={`Item has been successfully ${
                isEditing ? "updated" : "created"
              }.`}
              showActions={true}
              confirmText="OK"
              onConfirm={() => {
                closeModal("itemSaveSuccess");
                onSuccess();
              }}
            />,
            "small"
          );
        }, 300);
      } else {
        openModal(
          "itemSaveError",
          <AlertModal
            type="error"
            title="Error"
            message={result.message || "Failed to save item. Please try again."}
            showActions={true}
            confirmText="OK"
            onConfirm={() => closeModal("itemSaveError")}
          />,
          "small"
        );
      }
    } catch (err) {
      openModal(
        "itemSaveError",
        <AlertModal
          type="error"
          title="Error"
          message={err.message || "An error occurred while saving item."}
          showActions={true}
          confirmText="OK"
          onConfirm={() => closeModal("itemSaveError")}
        />,
        "small"
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Mendapatkan nilai field terjemahan untuk bahasa saat ini.
   * @param {string} field - Nama field
   * @returns {string|Object|Array} Nilai field
   */
  const getCurrentField = (field) => {
    return translations[currentLanguage][field];
  };

  /**
   * Mengatur nilai field terjemahan untuk bahasa saat ini.
   * @param {string} field - Nama field
   * @param {string|Object|Array} value - Nilai baru
   */
  const setCurrentField = (field, value) => {
    handleTranslationChange(field, value);
  };

  /** @type {Array<{value: string, label: string}>} Opsi kategori untuk dropdown */
  const categoryOptions = Array.isArray(categories)
    ? categories.map((cat) => ({
        value: cat.id,
        label: cat.name || cat.nama || "Unknown Category",
      }))
    : [];

  /** @type {Array<{value: string, label: string}>} Opsi brand untuk dropdown */
  const brandOptions = Array.isArray(brands)
    ? brands.map((brand) => ({
        value: brand.id,
        label: brand.name || brand.nama || "Unknown Brand",
      }))
    : [];

  return (
    <div className="items-form">
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="form-error">
            <AlertCircle size={16} />
            <span>{error}</span>
            <button
              type="button"
              className="error-close-btn"
              onClick={() => setError("")}
              aria-label="Close error"
            >
              <X size={16} />
            </button>
          </div>
        )}
        {/* Language Switcher */}
        <div className="language-switcher">
          <Globe size={16} />
          <span className="lang-label">Language:</span>
          <button
            type="button"
            className={`lang-btn ${currentLanguage === "EN" ? "active" : ""}`}
            onClick={() => handleLanguageChange("EN")}
            aria-label="Switch to English"
          >
            EN {translations.EN.longDescription && "✓"}
          </button>
          <button
            type="button"
            className={`lang-btn ${currentLanguage === "ID" ? "active" : ""}`}
            onClick={() => handleLanguageChange("ID")}
            aria-label="Switch to Indonesian"
          >
            ID {translations.ID.longDescription && "✓"}
          </button>
          <small className="lang-hint">
            {currentLanguage === "EN"
              ? "English is required"
              : "Indonesian is optional"}
          </small>
        </div>

        {isEditing && (
          <div className="image-info-banner">
            <AlertCircle size={16} />
            <span>
              You can add, remove, or keep existing item images. All images will
              be preserved unless you remove them.
            </span>
          </div>
        )}
        {/* Name */}
        <div
          className={`form-group ${validationErrors.name ? "has-error" : ""}`}
        >
          <label>
            Item Name <span className="required">*</span>
          </label>
          <input
            type="text"
            value={masterData.name}
            onChange={(e) => handleMasterChange("name", e.target.value)}
            placeholder="Enter item name in English"
            aria-label="Item name"
            aria-required="true"
          />
          {validationErrors.name && (
            <span className="field-error">{validationErrors.name}</span>
          )}
        </div>
        {/* Category & Brand */}
        <div className="form-row">
          <div
            className={`form-group half ${
              validationErrors.categoryId ? "has-error" : ""
            }`}
          >
            <CustomSelect
              label="Category"
              value={masterData.categoryId}
              onChange={(value) => handleMasterChange("categoryId", value)}
              options={categoryOptions}
              placeholder="Select Category"
              required={true}
              loading={categoriesLoading}
              disabled={categoriesLoading}
              aria-label="Select category"
            />
            {validationErrors.categoryId && (
              <span className="field-error">{validationErrors.categoryId}</span>
            )}
          </div>

          <div
            className={`form-group half ${
              validationErrors.brandId ? "has-error" : ""
            }`}
          >
            <CustomSelect
              label="Brand"
              value={masterData.brandId}
              onChange={(value) => handleMasterChange("brandId", value)}
              options={brandOptions}
              placeholder="Select Brand"
              required={true}
              loading={brandsLoading}
              disabled={brandsLoading}
              aria-label="Select brand"
            />
            {validationErrors.brandId && (
              <span className="field-error">{validationErrors.brandId}</span>
            )}
          </div>
        </div>
        {/* Short Description */}
        <div
          className={`form-group ${
            validationErrors[`${currentLanguage}.shortDescription`]
              ? "has-error"
              : ""
          }`}
        >
          <label>
            Short Description ({currentLanguage})
            {currentLanguage === "EN" && <span className="required">*</span>}
          </label>
          <textarea
            value={getCurrentField("shortDescription")}
            onChange={(e) =>
              setCurrentField("shortDescription", e.target.value)
            }
            placeholder={
              currentLanguage === "EN"
                ? "Enter short description in English (required)"
                : "Masukkan deskripsi singkat dalam Bahasa (opsional)"
            }
            rows={2}
            aria-label={`Short description in ${currentLanguage}`}
          />
          {validationErrors[`${currentLanguage}.shortDescription`] && (
            <span className="field-error">
              {validationErrors[`${currentLanguage}.shortDescription`]}
            </span>
          )}
        </div>
        {/* Long Description */}
        <div
          className={`form-group ${
            validationErrors[`${currentLanguage}.longDescription`]
              ? "has-error"
              : ""
          }`}
        >
          <label>
            Long Description ({currentLanguage})
            {currentLanguage === "EN" && <span className="required">*</span>}
          </label>
          <TiptapEditor
            value={getCurrentField("longDescription")}
            onChange={(value) => setCurrentField("longDescription", value)}
            placeholder={
              currentLanguage === "EN"
                ? "Enter long description in English (required)"
                : "Masukkan deskripsi panjang dalam Bahasa (opsional)"
            }
            rows={6}
            aria-label={`Long description in ${currentLanguage}`}
          />
          {validationErrors[`${currentLanguage}.longDescription`] && (
            <span className="field-error">
              {validationErrors[`${currentLanguage}.longDescription`]}
            </span>
          )}
        </div>
        {/* Specifications */}
        <div className="form-group">
          <label>Specifications ({currentLanguage})</label>
          <div className="specs-input">
            <input
              type="text"
              value={specKey}
              onChange={handleSpecKeyChange}
              placeholder={
                currentLanguage === "EN"
                  ? "Key (e.g., capacity)"
                  : "Kunci (misal: kapasitas)"
              }
              className="spec-key"
              aria-label={`Specification key in ${currentLanguage}`}
            />
            <input
              type="text"
              value={specValue}
              onChange={handleSpecValueChange}
              placeholder={
                currentLanguage === "EN"
                  ? "Value (e.g., 500W)"
                  : "Nilai (misal: 500W)"
              }
              className="spec-value"
              aria-label={`Specification value in ${currentLanguage}`}
            />
            <button
              type="button"
              onClick={handleAddSpecification}
              className="spec-add-btn"
              aria-label="Add specification"
            >
              +
            </button>
          </div>

          {/* Tampilkan error message */}
          {specError && (
            <div className="field-error" style={{ marginTop: "3px" }}>
              {specError}
            </div>
          )}

          <div className="specs-list">
            {Object.entries(getCurrentField("specifications")).map(
              ([key, value]) => (
                <div key={key} className="spec-item">
                  <span>
                    <strong>{key}:</strong> {value}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSpecification(key)}
                    className="spec-remove"
                    aria-label={`Remove specification ${key}`}
                  >
                    ×
                  </button>
                </div>
              )
            )}
          </div>
        </div>
        {/* Features */}
        <div className="form-group">
          <label>Features ({currentLanguage})</label>
          <div className="tags-input">
            <input
              type="text"
              value={featureInput}
              onChange={(e) => setFeatureInput(e.target.value)}
              placeholder={
                currentLanguage === "EN"
                  ? "Add feature and press Enter"
                  : "Tambah fitur dan tekan Enter"
              }
              onKeyDown={(e) =>
                e.key === "Enter" && (e.preventDefault(), handleAddFeature())
              }
              aria-label={`Add features in ${currentLanguage}`}
            />
            <button
              type="button"
              onClick={handleAddFeature}
              className="tag-add-btn"
              aria-label="Add feature"
            >
              +
            </button>
          </div>
          <div className="tags-list">
            {getCurrentField("features").map((feature, index) => (
              <span key={index} className="tag-item">
                {feature}
                <button
                  type="button"
                  onClick={() => handleRemoveFeature(feature)}
                  className="tag-remove"
                  aria-label={`Remove feature ${feature}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
        {/* Updated Images Section */}
        <div
          className={`form-group ${validationErrors.images ? "has-error" : ""}`}
        >
          <label>
            Item Images {!isEditing && <span className="required">*</span>}
          </label>

          {/* Image Grid */}
          {images.length > 0 && (
            <div className="image-grid">
              {images.map((img, index) => (
                <div key={img.id} className="image-grid-item">
                  <img src={img.preview} alt={`Image ${index + 1}`} aria-label={`Product image ${index + 1}`} />
                  <button
                    type="button"
                    className="image-remove-btn"
                    onClick={() => handleImageRemove(img.id)}
                    title="Remove image"
                    aria-label="Remove image"
                  >
                    <Trash2 size={14} />
                  </button>
                  {index === 0 && (
                    <span className="primary-badge">Primary</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Images Button */}
          <div className="image-upload-section">
            <input
              type="file"
              accept="image/png, image/jpeg, image/jpg"
              multiple
              onChange={handleImageAdd}
              id="item-images-upload"
              className="image-input"
              aria-label="Upload product images"
            />
            <label htmlFor="item-images-upload" className="image-upload-btn">
              <Upload size={16} />
              {images.length > 0 ? "Add More Images" : "Upload Images"}
            </label>
          </div>

          {imageError && <span className="field-error">{imageError}</span>}
          {validationErrors.images && !imageError && (
            <span className="field-error">{validationErrors.images}</span>
          )}

          <small className="field-hint">
            Only PNG or JPG. Max 2MB per image. First image will be the primary
            image.
          </small>
        </div>
        {/* Sort Order */}
        <div className="form-group">
          <label>Sort Order</label>
          <input
            type="number"
            value={masterData.sortOrder}
            onChange={(e) => {
              const value = e.target.value;
              handleMasterChange(
                "sortOrder",
                value === "" ? 0 : parseInt(value, 10) || 0
              );
            }}
            placeholder="0"
            min="0"
            aria-label="Sort order"
          />
          <small className="field-hint">
            • <strong>0</strong> = Automatic positioning (placed at the end)
          </small>
        </div>
        {/* Status & Featured */}
        <div className="form-row">
          <div className="form-group half">
            <label>Status</label>
            <div className="status-toggle">
              <button
                type="button"
                className={masterData.isActive ? "active" : ""}
                onClick={() => handleStatusChange(true)}
                aria-label="Set status to active"
              >
                Active
              </button>
              <button
                type="button"
                className={!masterData.isActive ? "active" : ""}
                onClick={() => handleStatusChange(false)}
                aria-label="Set status to inactive"
              >
                Inactive
              </button>
            </div>
          </div>

          <div className="form-group half">
            <label>Featured</label>
            <div className="toggle-group">
              <button
                type="button"
                className={masterData.isFeatured ? "active" : ""}
                onClick={() => handleFeaturedChange(true)}
                aria-label="Mark as featured"
              >
                Yes
              </button>
              <button
                type="button"
                className={!masterData.isFeatured ? "active" : ""}
                onClick={() => handleFeaturedChange(false)}
                aria-label="Unmark as featured"
              >
                No
              </button>
            </div>
          </div>
        </div>

        {/* SEO Fields */}
        <div className="form-section">
          <h4 className="section-title">SEO Settings ({currentLanguage})</h4>
          <div className="form-group">
            <label>Meta Title ({currentLanguage})</label>
            <input
              type="text"
              value={getCurrentField("metaTitle")}
              onChange={(e) => setCurrentField("metaTitle", e.target.value)}
              placeholder={
                currentLanguage === "EN"
                  ? "SEO title in English (optional)"
                  : "Judul SEO dalam Bahasa (opsional)"
              }
              aria-label={`Meta title in ${currentLanguage}`}
            />
          </div>
          <div className="form-group">
            <label>Meta Description ({currentLanguage})</label>
            <textarea
              value={getCurrentField("metaDescription")}
              onChange={(e) =>
                setCurrentField("metaDescription", e.target.value)
              }
              placeholder={
                currentLanguage === "EN"
                  ? "SEO description in English (optional)"
                  : "Deskripsi SEO dalam Bahasa (opsional)"
              }
              rows={2}
              aria-label={`Meta description in ${currentLanguage}`}
            />
          </div>
          <div className="form-group">
            <label>Meta Keywords ({currentLanguage})</label>
            <input
              type="text"
              value={getCurrentField("metaKeywords")}
              onChange={(e) => setCurrentField("metaKeywords", e.target.value)}
              placeholder={
                currentLanguage === "EN"
                  ? "Comma-separated English keywords (optional)"
                  : "Kata kunci Bahasa dipisah koma (opsional)"
              }
              aria-label={`Meta keywords in ${currentLanguage}`}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={loading}
            aria-label="Cancel form"
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <PulseDots size="sm" color="#ffffff" count={6} />
            ) : isEditing ? (
              "Update Item"
            ) : (
              "Create Item"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ItemsForm;