// import { Category, ProductCategory, Product } from '../models/index.js';
// import ApiResponse from '../utils/ApiResponse.js';
// import { HTTP_STATUS_CODES, ERROR_MESSAGES } from '../constants/constant.js';
// import slugify from 'slugify';

// // Helper function to transform category data for API responses
// const transformCategoryData = (category, req) => {
//   if (!category) return null;

//   const categoryJSON = category.toJSON ? category.toJSON() : { ...category };

//   // Determine protocol: prefer X-Forwarded-Proto header, fall back to req.protocol
//   const protocol = req.headers['x-forwarded-proto'] || req.protocol;
//   const host = req.get('host');
//   const baseUrl = `${protocol}://${host}`;

//   // Add image URL if image exists
//   if (categoryJSON.image) {
//     categoryJSON.imageUrl = `${baseUrl}/api/categories/images/${categoryJSON.id}`;
//     // Remove the large base64 string from response
//     delete categoryJSON.image;
//   }

//   // Transform subcategories recursively if they exist
//   if (categoryJSON.subcategories && categoryJSON.subcategories.length > 0) {
//     categoryJSON.subcategories = categoryJSON.subcategories.map((subcat) =>
//       transformCategoryData(subcat, req),
//     );
//   }

//   return categoryJSON;
// };

// // export const getAllCategories = async (req, res, next) => {
// //     try {
// //         const categories = await Category.findAll({
// //             where: { isActive: true },
// //             order: [['displayOrder', 'ASC']],
// //             include: [{ model: Category, as: 'subcategories', paranoid: false }],
// //             paranoid: false
// //         });

// //         // Transform categories to include image URLs
// //         // const baseUrl = `${req.protocol}://${req.get('host')}`;
// //         const transformedCategories = categories.map(category =>
// //             transformCategoryData(category, req)
// //         );

// //         return ApiResponse.success(res, 'Categories retrieved', transformedCategories);
// //     } catch (error) {
// //         next(error);
// //     }
// // };

// // export const getCategoryDetails = async (req, res, next) => {
// //     try {
// //         const category = await Category.findByPk(req.params.id, {
// //             include: [
// //                 { model: Category, as: 'subcategories', paranoid: false },
// //                 { model: Product, as: 'products', through: { attributes: [] }, paranoid: false }
// //             ],
// //             paranoid: false
// //         });

// //         if (!category) {
// //             return ApiResponse.error(res, ERROR_MESSAGES.CATEGORY_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
// //         }

// //         // Transform category to include image URL
// //         // const baseUrl = `${req.protocol}://${req.get('host')}`;
// //         const transformedCategory = transformCategoryData(category, req);

// //         return ApiResponse.success(res, 'Category details', transformedCategory);
// //     } catch (error) {
// //         next(error);
// //     }
// // };

// export const getCategoryImage = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const category = await Category.findByPk(id);

//     if (!category || !category.image) {
//       return ApiResponse.error(res, 'Image not found', 404);
//     }

//     const imageBuffer = Buffer.from(category.image, 'base64');
//     res.set('Content-Type', 'image/jpeg'); // You might want to store and use the actual mime type
//     res.set('Cache-Control', 'public, max-age=31557600'); // Cache for 1 year
//     return res.send(imageBuffer);
//   } catch (error) {
//     next(error);
//   }
// };

// // export const createMainCategory = async (req, res, next) => {
// //     try {
// //         const { name, description, image, isActive, displayOrder } = req.body;
// //         const slug = slugify(name, { lower: true, strict: true });
// //         const categoryImage = req.file ? req.file.buffer.toString('base64') : image;

// //         const category = await Category.create({
// //             name,
// //             slug,
// //             description,
// //             image: categoryImage,
// //             isActive: isActive !== undefined ? isActive : true,
// //             displayOrder: displayOrder || 0
// //         });

// //         // Transform response to include image URL
// //         //const baseUrl = `${req.protocol}://${req.get('host')}`;
// //         const transformedCategory = transformCategoryData(category, req);

// //         return ApiResponse.success(res, 'Main category created', transformedCategory, HTTP_STATUS_CODES.CREATED);
// //     } catch (error) {
// //         next(error);
// //     }
// // };

// // export const createSubCategory = async (req, res, next) => {
// //     try {
// //         const parent = await Category.findByPk(req.params.categoryId);
// //         if (!parent) {
// //             return ApiResponse.error(res, ERROR_MESSAGES.PARENT_CATEGORY_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
// //         }

// //         const { name, description, image, isActive, displayOrder } = req.body;
// //         const slug = slugify(name, { lower: true, strict: true });
// //         const categoryImage = req.file ? req.file.buffer.toString('base64') : image;

// //         const category = await Category.create({
// //             name,
// //             slug,
// //             description,
// //             image: categoryImage,
// //             isActive: isActive !== undefined ? isActive : true,
// //             displayOrder: displayOrder || 0,
// //             parentId: parent.id
// //         });

// //         // Transform response to include image URL
// //         // const baseUrl = `${req.protocol}://${req.get('host')}`;
// //         const transformedCategory = transformCategoryData(category, req);

// //         return ApiResponse.success(res, 'Sub-category created', transformedCategory, HTTP_STATUS_CODES.CREATED);
// //     } catch (error) {
// //         next(error);
// //     }
// // };

// // export const createSubSubCategory = async (req, res, next) => {
// //     try {
// //         const parent = await Category.findByPk(req.params.subCategoryId);
// //         if (!parent) {
// //             return ApiResponse.error(res, ERROR_MESSAGES.PARENT_CATEGORY_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
// //         }

// //         const { name, description, image, isActive, displayOrder } = req.body;
// //         const slug = slugify(name, { lower: true, strict: true });
// //         const categoryImage = req.file ? req.file.buffer.toString('base64') : image;

// //         const category = await Category.create({
// //             name,
// //             slug,
// //             description,
// //             image: categoryImage,
// //             isActive: isActive !== undefined ? isActive : true,
// //             displayOrder: displayOrder || 0,
// //             parentId: parent.id
// //         });

// //         // Transform response to include image URL
// //         // const baseUrl = `${req.protocol}://${req.get('host')}`;
// //         const transformedCategory = transformCategoryData(category, req);

// //         return ApiResponse.success(res, 'Sub-sub-category created', transformedCategory, HTTP_STATUS_CODES.CREATED);
// //     } catch (error) {
// //         next(error);
// //     }
// // };

// // export const updateCategory = async (req, res, next) => {
// //     try {
// //         const category = await Category.findByPk(req.params.id);
// //         if (!category) {
// //             return ApiResponse.error(res, ERROR_MESSAGES.CATEGORY_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
// //         }

// //         const { name, description, image, isActive, displayOrder, parentId } = req.body;
// //         const slug = name ? slugify(name, { lower: true, strict: true }) : category.slug;
// //         let categoryImage;
// //         if (req.file) {
// //             categoryImage = req.file.buffer.toString('base64');
// //         } else if (image === null) {
// //             categoryImage = null;
// //         } else {
// //             categoryImage = image || category.image;
// //         }

// //         await category.update({
// //             name,
// //             slug,
// //             description,
// //             image: categoryImage,
// //             isActive: isActive !== undefined ? isActive : category.isActive,
// //             displayOrder: displayOrder || category.displayOrder,
// //             parentId
// //         });

// //         // Transform response to include image URL
// //         //const baseUrl = `${req.protocol}://${req.get('host')}`;
// //         const transformedCategory = transformCategoryData(category, req);

// //         return ApiResponse.success(res, 'Category updated', transformedCategory);
// //     } catch (error) {
// //         next(error);
// //     }
// // };

// // export const deleteCategory = async (req, res, next) => {
// //     try {
// //         const category = await Category.findByPk(req.params.id);
// //         if (!category) {
// //             return ApiResponse.error(res, ERROR_MESSAGES.CATEGORY_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
// //         }

// //         // Check if category has products or subcategories
// //         const hasProducts = await ProductCategory.count({ where: { categoryId: category.id } }) > 0;
// //         const hasSubcategories = await Category.count({ where: { parentId: category.id } }) > 0;
// //         if (hasProducts || hasSubcategories) {
// //             return ApiResponse.error(res, ERROR_MESSAGES.CATEGORY_CONTAINS_PRODUCTS, HTTP_STATUS_CODES.CONFLICT);
// //         }

// //         await category.destroy();
// //         return ApiResponse.success(res, 'Category deleted', null, HTTP_STATUS_CODES.NO_CONTENT);
// //     } catch (error) {
// //         next(error);
// //     }
// // };

// export const getAllCategories = async (req, res, next) => {
//   try {
//     const categories = await Category.findAll({
//       where: { isActive: true },
//       order: [['displayOrder', 'ASC']],
//       include: [{ model: Category, as: 'subcategories', paranoid: false }],
//       paranoid: false,
//     });
//     return ApiResponse.success(res, 'Categories retrieved', categories);
//   } catch (error) {
//     next(error);
//   }
// };

// export const getCategoryDetails = async (req, res, next) => {
//   try {
//     const category = await Category.findByPk(req.params.id, {
//       include: [
//         { model: Category, as: 'subcategories', paranoid: false },
//         { model: Product, as: 'products', through: { attributes: [] }, paranoid: false },
//       ],
//       paranoid: false,
//     });
//     if (!category) {
//       return ApiResponse.error(res, ERROR_MESSAGES.CATEGORY_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
//     }
//     return ApiResponse.success(res, 'Category details', category);
//   } catch (error) {
//     next(error);
//   }
// };

// export const createMainCategory = async (req, res, next) => {
//   try {
//     const { name, description, image, isActive, displayOrder } = req.body;
//     const slug = slugify(name, { lower: true, strict: true });
//     const categoryImage = req.file ? req.file.buffer.toString('base64') : image;

//     const category = await Category.create({
//       name,
//       slug,
//       description,
//       image: categoryImage,
//       isActive: isActive !== undefined ? isActive : true,
//       displayOrder: displayOrder || 0,
//     });

//     return ApiResponse.success(res, 'Main category created', category, HTTP_STATUS_CODES.CREATED);
//   } catch (error) {
//     next(error);
//   }
// };

// export const createSubCategory = async (req, res, next) => {
//   try {
//     const parent = await Category.findByPk(req.params.categoryId);
//     if (!parent) {
//       return ApiResponse.error(
//         res,
//         ERROR_MESSAGES.PARENT_CATEGORY_NOT_FOUND,
//         HTTP_STATUS_CODES.NOT_FOUND,
//       );
//     }

//     const { name, description, image, isActive, displayOrder } = req.body;
//     const slug = slugify(name, { lower: true, strict: true });
//     const categoryImage = req.file ? req.file.buffer.toString('base64') : image;

//     const category = await Category.create({
//       name,
//       slug,
//       description,
//       image: categoryImage,
//       isActive: isActive !== undefined ? isActive : true,
//       displayOrder: displayOrder || 0,
//       parentId: parent.id,
//     });

//     return ApiResponse.success(res, 'Sub-category created', category, HTTP_STATUS_CODES.CREATED);
//   } catch (error) {
//     next(error);
//   }
// };

// export const createSubSubCategory = async (req, res, next) => {
//   try {
//     const parent = await Category.findByPk(req.params.subCategoryId);
//     if (!parent) {
//       return ApiResponse.error(
//         res,
//         ERROR_MESSAGES.PARENT_CATEGORY_NOT_FOUND,
//         HTTP_STATUS_CODES.NOT_FOUND,
//       );
//     }

//     const { name, description, image, isActive, displayOrder } = req.body;
//     const slug = slugify(name, { lower: true, strict: true });
//     const categoryImage = req.file ? req.file.buffer.toString('base64') : image;

//     const category = await Category.create({
//       name,
//       slug,
//       description,
//       image: categoryImage,
//       isActive: isActive !== undefined ? isActive : true,
//       displayOrder: displayOrder || 0,
//       parentId: parent.id,
//     });

//     return ApiResponse.success(
//       res,
//       'Sub-sub-category created',
//       category,
//       HTTP_STATUS_CODES.CREATED,
//     );
//   } catch (error) {
//     next(error);
//   }
// };

// export const updateCategory = async (req, res, next) => {
//   try {
//     const category = await Category.findByPk(req.params.id);
//     if (!category) {
//       return ApiResponse.error(res, ERROR_MESSAGES.CATEGORY_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
//     }

//     const { name, description, image, isActive, displayOrder, parentId } = req.body;
//     const slug = name ? slugify(name, { lower: true, strict: true }) : category.slug;
//     let categoryImage;
//     if (req.file) {
//       categoryImage = req.file.buffer.toString('base64');
//     } else if (image === null) {
//       categoryImage = null;
//     } else {
//       categoryImage = image || category.image;
//     }

//     await category.update({
//       name,
//       slug,
//       description,
//       image: categoryImage,
//       isActive: isActive !== undefined ? isActive : category.isActive,
//       displayOrder: displayOrder || category.displayOrder,
//       parentId,
//     });

//     return ApiResponse.success(res, 'Category updated', category);
//   } catch (error) {
//     next(error);
//   }
// };

// export const deleteCategory = async (req, res, next) => {
//   try {
//     const category = await Category.findByPk(req.params.id);
//     if (!category) {
//       return ApiResponse.error(res, ERROR_MESSAGES.CATEGORY_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
//     }

//     // Check if category has products or subcategories
//     const hasProducts = (await ProductCategory.count({ where: { categoryId: category.id } })) > 0;
//     const hasSubcategories = (await Category.count({ where: { parentId: category.id } })) > 0;
//     if (hasProducts || hasSubcategories) {
//       return ApiResponse.error(
//         res,
//         ERROR_MESSAGES.CATEGORY_CONTAINS_PRODUCTS,
//         HTTP_STATUS_CODES.CONFLICT,
//       );
//     }

//     await category.destroy();
//     return ApiResponse.success(res, 'Category deleted', null, HTTP_STATUS_CODES.NO_CONTENT);
//   } catch (error) {
//     next(error);
//   }
// };

import { Category, ProductCategory, Product } from '../models/index.js';
import ApiResponse from '../utils/ApiResponse.js';
import { HTTP_STATUS_CODES, ERROR_MESSAGES } from '../constants/constant.js';
import slugify from 'slugify';

// Helper function to transform category data for API responses
const transformCategoryData = (category, req) => {
  if (!category) return null;

  const categoryJSON = category.toJSON ? category.toJSON() : { ...category };

  // Determine protocol: prefer X-Forwarded-Proto header, fall back to req.protocol
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  const baseUrl = `${protocol}://${host}`;

  // Add image URL if image exists
  if (categoryJSON.image) {
    categoryJSON.imageUrl = `${baseUrl}/api/categories/images/${categoryJSON.id}`;
    // Remove the large base64 string from response
    delete categoryJSON.image;
  }

  // Transform subcategories recursively if they exist
  if (categoryJSON.subcategories && categoryJSON.subcategories.length > 0) {
    categoryJSON.subcategories = categoryJSON.subcategories.map((subcat) =>
      transformCategoryData(subcat, req),
    );
  }

  return categoryJSON;
};

export const getAllCategories = async (req, res, next) => {
  try {
    // Get main categories (where parentId is null)
    const mainCategories = await Category.findAll({
      where: {
        isActive: true,
        parentId: null,
      },
      order: [['displayOrder', 'ASC']],
      paranoid: false,
    });

    // For each main category, fetch its complete hierarchy
    const categoriesWithHierarchy = await Promise.all(
      mainCategories.map(async (mainCategory) => {
        const categoryWithSubcategories = await Category.findByPk(mainCategory.id, {
          include: [
            {
              model: Category,
              as: 'subcategories',
              paranoid: false,
              include: [
                {
                  model: Category,
                  as: 'subcategories',
                  paranoid: false,
                },
              ],
            },
          ],
          paranoid: false,
        });

        return categoryWithSubcategories;
      }),
    );

    // Transform categories to include image URLs
    const transformedCategories = categoriesWithHierarchy.map((category) =>
      transformCategoryData(category, req),
    );

    return ApiResponse.success(res, 'Categories retrieved', transformedCategories);
  } catch (error) {
    next(error);
  }
};

export const getCategoryDetails = async (req, res, next) => {
  try {
    const category = await Category.findByPk(req.params.id, {
      include: [
        {
          model: Category,
          as: 'subcategories',
          paranoid: false,
          include: [
            {
              model: Category,
              as: 'subcategories',
              paranoid: false,
            },
          ],
        },
        {
          model: Product,
          as: 'products',
          through: { attributes: [] },
          paranoid: false,
        },
      ],
      paranoid: false,
    });

    if (!category) {
      return ApiResponse.error(res, ERROR_MESSAGES.CATEGORY_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }

    // Transform category to include image URL
    const transformedCategory = transformCategoryData(category, req);

    return ApiResponse.success(res, 'Category details', transformedCategory);
  } catch (error) {
    next(error);
  }
};

export const getSubcategoryDetails = async (req, res, next) => {
  try {
    const { subcategoryId } = req.params;

    const subcategory = await Category.findOne({
      where: {
        id: subcategoryId,
        parentId: { [Op.not]: null }, // Ensure this is a subcategory
      },
      include: [
        {
          model: Category,
          as: 'subcategories',
          paranoid: false,
        },
        {
          model: Product,
          as: 'products',
          through: { attributes: [] },
          paranoid: false,
        },
      ],
      paranoid: false,
    });

    if (!subcategory) {
      return ApiResponse.error(res, 'Subcategory not found', HTTP_STATUS_CODES.NOT_FOUND);
    }

    // Transform subcategory to include image URL
    const transformedSubcategory = transformCategoryData(subcategory, req);

    return ApiResponse.success(res, 'Subcategory details', transformedSubcategory);
  } catch (error) {
    next(error);
  }
};

export const getSubSubcategories = async (req, res, next) => {
  try {
    const { subcategoryId } = req.params;

    // First verify this is a valid subcategory
    const subcategory = await Category.findByPk(subcategoryId);

    if (!subcategory || subcategory.parentId === null) {
      return ApiResponse.error(res, 'Invalid subcategory ID', HTTP_STATUS_CODES.NOT_FOUND);
    }

    // Get all subsubcategories under this subcategory
    const subSubcategories = await Category.findAll({
      where: {
        parentId: subcategoryId,
        isActive: true,
      },
      order: [['displayOrder', 'ASC']],
      paranoid: false,
    });

    // Transform subsubcategories to include image URLs
    const transformedSubSubcategories = subSubcategories.map((category) =>
      transformCategoryData(category, req),
    );

    return ApiResponse.success(res, 'Sub-subcategories retrieved', transformedSubSubcategories);
  } catch (error) {
    next(error);
  }
};

export const getSubSubcategoryDetails = async (req, res, next) => {
  try {
    const { subSubcategoryId } = req.params;

    const subSubcategory = await Category.findByPk(subSubcategoryId, {
      include: [
        {
          model: Product,
          as: 'products',
          through: { attributes: [] },
          paranoid: false,
        },
      ],
      paranoid: false,
    });

    if (!subSubcategory) {
      return ApiResponse.error(res, 'Sub-subcategory not found', HTTP_STATUS_CODES.NOT_FOUND);
    }

    // Verify this is actually a sub-subcategory by checking its parent's parent
    const parent = await Category.findByPk(subSubcategory.parentId);
    if (!parent || parent.parentId === null) {
      return ApiResponse.error(res, 'Not a valid sub-subcategory', HTTP_STATUS_CODES.BAD_REQUEST);
    }

    // Transform sub-subcategory to include image URL
    const transformedSubSubcategory = transformCategoryData(subSubcategory, req);

    return ApiResponse.success(res, 'Sub-subcategory details', transformedSubSubcategory);
  } catch (error) {
    next(error);
  }
};

export const getCategoryImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const category = await Category.findByPk(id);

    if (!category || !category.image) {
      return ApiResponse.error(res, 'Image not found', 404);
    }

    const imageBuffer = Buffer.from(category.image, 'base64');
    res.set('Content-Type', 'image/jpeg'); // You might want to store and use the actual mime type
    res.set('Cache-Control', 'public, max-age=31557600'); // Cache for 1 year
    return res.send(imageBuffer);
  } catch (error) {
    next(error);
  }
};

export const createMainCategory = async (req, res, next) => {
  try {
    const { name, description, image, isActive, displayOrder } = req.body;
    const slug = slugify(name, { lower: true, strict: true });
    const categoryImage = req.file ? req.file.buffer.toString('base64') : image;

    const category = await Category.create({
      name,
      slug,
      description,
      image: categoryImage,
      isActive: isActive !== undefined ? isActive : true,
      displayOrder: displayOrder || 0,
    });

    // Transform response to include image URL
    const transformedCategory = transformCategoryData(category, req);

    return ApiResponse.success(
      res,
      'Main category created',
      transformedCategory,
      HTTP_STATUS_CODES.CREATED,
    );
  } catch (error) {
    next(error);
  }
};

export const createSubCategory = async (req, res, next) => {
  try {
    const parent = await Category.findByPk(req.params.categoryId);
    if (!parent) {
      return ApiResponse.error(
        res,
        ERROR_MESSAGES.PARENT_CATEGORY_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND,
      );
    }

    // Ensure that we're creating a subcategory under a main category
    if (parent.parentId !== null) {
      return ApiResponse.error(
        res,
        'Cannot create subcategory under another subcategory. Use createSubSubCategory instead.',
        HTTP_STATUS_CODES.BAD_REQUEST,
      );
    }

    const { name, description, image, isActive, displayOrder } = req.body;
    const slug = slugify(name, { lower: true, strict: true });
    const categoryImage = req.file ? req.file.buffer.toString('base64') : image;

    const category = await Category.create({
      name,
      slug,
      description,
      image: categoryImage,
      isActive: isActive !== undefined ? isActive : true,
      displayOrder: displayOrder || 0,
      parentId: parent.id,
    });

    // Transform response to include image URL
    const transformedCategory = transformCategoryData(category, req);

    return ApiResponse.success(
      res,
      'Sub-category created',
      transformedCategory,
      HTTP_STATUS_CODES.CREATED,
    );
  } catch (error) {
    next(error);
  }
};

export const createSubSubCategory = async (req, res, next) => {
  try {
    const parent = await Category.findByPk(req.params.subCategoryId);
    if (!parent) {
      return ApiResponse.error(
        res,
        ERROR_MESSAGES.PARENT_CATEGORY_NOT_FOUND,
        HTTP_STATUS_CODES.NOT_FOUND,
      );
    }

    // Ensure we're creating a subsubcategory under a subcategory (not a main category)
    if (parent.parentId === null) {
      return ApiResponse.error(
        res,
        'Cannot create a sub-subcategory directly under a main category.',
        HTTP_STATUS_CODES.BAD_REQUEST,
      );
    }

    const { name, description, image, isActive, displayOrder } = req.body;
    const slug = slugify(name, { lower: true, strict: true });
    const categoryImage = req.file ? req.file.buffer.toString('base64') : image;

    const category = await Category.create({
      name,
      slug,
      description,
      image: categoryImage,
      isActive: isActive !== undefined ? isActive : true,
      displayOrder: displayOrder || 0,
      parentId: parent.id,
    });

    // Transform response to include image URL
    const transformedCategory = transformCategoryData(category, req);

    return ApiResponse.success(
      res,
      'Sub-sub-category created',
      transformedCategory,
      HTTP_STATUS_CODES.CREATED,
    );
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return ApiResponse.error(res, ERROR_MESSAGES.CATEGORY_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }

    const { name, description, image, isActive, displayOrder, parentId } = req.body;
    const slug = name ? slugify(name, { lower: true, strict: true }) : category.slug;
    let categoryImage;
    if (req.file) {
      categoryImage = req.file.buffer.toString('base64');
    } else if (image === null) {
      categoryImage = null;
    } else {
      categoryImage = image || category.image;
    }

    await category.update({
      name,
      slug,
      description,
      image: categoryImage,
      isActive: isActive !== undefined ? isActive : category.isActive,
      displayOrder: displayOrder || category.displayOrder,
      parentId,
    });

    // Transform response to include image URL
    const transformedCategory = transformCategoryData(category, req);

    return ApiResponse.success(res, 'Category updated', transformedCategory);
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return ApiResponse.error(res, ERROR_MESSAGES.CATEGORY_NOT_FOUND, HTTP_STATUS_CODES.NOT_FOUND);
    }

    // Check if category has products or subcategories
    const hasProducts = (await ProductCategory.count({ where: { categoryId: category.id } })) > 0;
    const hasSubcategories = (await Category.count({ where: { parentId: category.id } })) > 0;
    if (hasProducts || hasSubcategories) {
      return ApiResponse.error(
        res,
        ERROR_MESSAGES.CATEGORY_CONTAINS_PRODUCTS,
        HTTP_STATUS_CODES.CONFLICT,
      );
    }

    await category.destroy();
    return ApiResponse.success(res, 'Category deleted', null, HTTP_STATUS_CODES.NO_CONTENT);
  } catch (error) {
    next(error);
  }
};
