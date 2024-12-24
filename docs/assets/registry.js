/*
 * Resource registry from json that is filtered by tags.
 */
class Registry {
  /*
   * Create new registry from index of tagged resources.
   */
  constructor(index) {
      this.index = index;
      this.flat = this.flatten();
      this.fields = this.map_fields();
      [this.map, this.tree] = this.map_tree();
      console.log('Mapped registry tree:', this.tree);
  }

  /*
   * Fetch the json from server, returning a parsed Registry object.
   */
  static async load(url) {
    // https://www.geeksforgeeks.org/how-to-convert-an-onload-promise-into-async-await/
    console.log(`Loading registry from ${url}`);
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Failed to fetch registry from ${url}`);
    const index = await response.json();
    console.log('Loaded registry', index);
    return new Registry(index);
  }

  /*
   * Return the set with any or all matching tags applied.
   */
  filter(tags, op='and', key=null) {
    if( !exists(tags) || tags.length == 0 ) {
      console.warn(`tried to filter registry with no tags`);
      return this.index;
    }

    if( !(op === 'and' || op === 'or') ) {
      console.warn(`Registry.filter() expects op to be 'and' 'or' (was '${op}')`);
      return this.index;
    }

    //console.log('filter tags=', tags, 'op=', op, 'key=', key);

    if( exists(key) ) { // just check this key only
      for( let tag of tags ) {
        const has_tag = this.flat[key].tags.includes(tag);
        //console.log(`key=${key} tag=${tag} has_tag=${has_tag}  flat=${this.flat[key].tags}`);
        if( !has_tag ) {
          if( op === 'and' )
            return false;
        }
        else {
          if( op === 'or' )
            return true;
        }
      }
      return (op === 'and');
    }
    else { // find all keys with this set of tags
      let matches = {};

      for( let id in this.index ) {
        if( this.filter(tags, op, id) ) {
          matches[id] = this.index[id];
          //console.log(`MATCH FOUUND ${id}`);
        }  
      }

      return matches;
    }
  }

  /*
   * Return an index where the tag lists include all parent tags
   * in the heirarchy, up to and including the maximum tree depth.
   * @note a cached version is already available in `Registry.flat`
   */
  flatten(args={}) {
    const key = args.key;
    const depth = args.depth;
    var output = args.output ?? {tags: []};
    
    if( exists(key) ) { // flatten just one in particular
      if( exists(depth) )
        depth -= 1;

      if( !(key in this.index) ) {
        console.warn(`missing tag '${key}' from index`);
        return tags;
      }

      for( let var_key in this.index[key] ) {
        if( !(var_key in output) )
          output[var_key] = this.index[key][var_key];
      }

      for( let key_tag of this.index[key].tags ) {
        if( !output.tags.includes(key_tag) )
          output.tags.push(key_tag);

        if( !exists(depth) || depth >= 0 )
          output = this.flatten({depth: depth, key: key_tag, output: output});
      }

      return output;
    }
    else { // flatten all resources in the index
      let flat = {};

      for( let key in this.index ) {
        flat[key] = this.flatten({depth: depth, key: key});
      }

      return flat;
    }
  }

  /**
   * Build the set of fields/parameters for each tag.
   * @note this should only be run after flatten()
   */
  map_fields(index=this.index) {
    var fields = {};
    for( let key in index ) {
      for( let field in this.flat[key] ) {
        if( !(field in this.index) )
          continue;
        if( !this.flat[field].tags.includes('field') )
          continue;
        if( !(key in fields) )
          fields[key] = [];
        if( !fields[key].includes(field) )
          fields[key].push(field);
      }
      console.log('map_fields', key, fields);
    }
    return fields;
  }

  /**
   * Build the tree of hierarchical tags.
   */
  map_tree(index=this.index) {
    //const index = exists(args.index) ? args.index : this.index;
    var map = {}, tree = {};

    for( let key in index )
      map[key] = {parents: [], children: []};

    for( let key in index ) {
      for( let tag of index[key].tags ) {
        if( !(tag in map) ) {
          console.warn(`tag '${tag}' was missing from index, skipping it in the tree`);
          continue;
        }
        map[key].parents.push(tag);
        map[tag].children.push(key);
      }
    }

    for( let key in map ) {
      if( map[key].parents.length == 0 )
        tree[key] = map[key];
    }

    return [map, tree];
  }
}
